import { Request, Response } from "express";
import { db } from "../db";
import { chatConversations, chatParticipants, chatMessages, users } from "../db/schema";
import { eq, and, sql, desc, asc, ne, inArray } from "drizzle-orm";

export const ChatController = {
    // GET /api/chat/conversations
    // Ambil semua percakapan yang diikuti oleh user saat ini (baik direct maupun group)
    async getConversations(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

            // 1. Ambil daftar conversationId yang diikuti user
            const myMemberships = await db
                .select({
                    conversationId: chatParticipants.conversationId,
                    lastReadAt: chatParticipants.lastReadAt,
                    role: chatParticipants.role,
                })
                .from(chatParticipants)
                .where(eq(chatParticipants.userId, currentUserId));

            if (myMemberships.length === 0) {
                return res.json([]);
            }

            const convIds = myMemberships.map(m => m.conversationId);
            const myMembershipMap = new Map(myMemberships.map(m => [m.conversationId, m]));

            // 2. Ambil detail percakapan
            const conversations = await db.query.chatConversations.findMany({
                where: inArray(chatConversations.id, convIds),
                with: {
                    participants: {
                        with: {
                            user: {
                                columns: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    role: true,
                                    avatarInitials: true,
                                    image: true,
                                    status: true,
                                }
                            }
                        }
                    },
                    messages: {
                        orderBy: (msg, { desc }) => [desc(msg.createdAt)],
                        limit: 1,
                        with: {
                            sender: {
                                columns: {
                                    id: true,
                                    name: true,
                                    avatarInitials: true,
                                }
                            }
                        }
                    }
                },
                orderBy: (c, { desc }) => [desc(c.lastMessageAt)],
            });

            // 3. Format respons dengan unread count dan info lawan bicara jika direct
            const formatted = await Promise.all(conversations.map(async (c) => {
                const membership = myMembershipMap.get(c.id);
                const lastRead = membership?.lastReadAt ? new Date(membership.lastReadAt) : new Date(0);

                // Hitung pesan yang belum dibaca sejak lastReadAt (yang bukan dikirim oleh user sendiri)
                const [unreadCountResult] = await db
                    .select({ count: sql<number>`count(*)` })
                    .from(chatMessages)
                    .where(and(
                        eq(chatMessages.conversationId, c.id),
                        sql`${chatMessages.createdAt} > ${lastRead}`,
                        ne(chatMessages.senderId, currentUserId)
                    ));

                const unreadCount = Number(unreadCountResult?.count) || 0;
                const lastMsg = c.messages[0] || null;

                let title = c.title;
                let avatar = c.avatar;
                let otherUser = null;

                if (c.type === 'direct') {
                    // Cari partisipan lain selain current user
                    const otherParticipant = c.participants.find(p => p.userId !== currentUserId);
                    if (otherParticipant?.user) {
                        otherUser = otherParticipant.user;
                        title = otherParticipant.user.name;
                        avatar = otherParticipant.user.image || null;
                    } else {
                        title = 'Obrolan Pribadi';
                    }
                }

                return {
                    id: c.id,
                    type: c.type,
                    title,
                    avatar,
                    otherUser,
                    projectId: c.projectId,
                    lastMessage: lastMsg ? {
                        id: lastMsg.id,
                        content: lastMsg.content,
                        senderId: lastMsg.senderId,
                        senderName: lastMsg.sender?.name,
                        createdAt: lastMsg.createdAt,
                        attachmentType: lastMsg.attachmentType,
                    } : null,
                    lastMessageAt: c.lastMessageAt,
                    unreadCount,
                    participantCount: c.participants.length,
                    participants: c.participants.map(p => ({
                        id: p.userId,
                        name: p.user?.name,
                        role: p.role,
                        avatarInitials: p.user?.avatarInitials,
                    })),
                };
            }));

            res.json(formatted);
        } catch (error: any) {
            console.error("ChatController.getConversations error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/chat/direct
    // Buat atau temukan percakapan personal (1-on-1) dengan user target
    async getOrCreateDirectConversation(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            const { targetUserId } = req.body;
            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });
            if (!targetUserId) return res.status(400).json({ error: "targetUserId is required" });
            if (currentUserId === targetUserId) return res.status(400).json({ error: "Cannot chat with yourself" });

            // Cari apakah sudah ada direct conversation antara currentUserId dan targetUserId
            const existing = await db.execute(sql`
                SELECT c.id
                FROM chat_conversations c
                JOIN chat_participants p1 ON c.id = p1.conversation_id AND p1.user_id = ${currentUserId}
                JOIN chat_participants p2 ON c.id = p2.conversation_id AND p2.user_id = ${targetUserId}
                WHERE c.type = 'direct'
                LIMIT 1;
            `);

            if (existing.rows && existing.rows.length > 0) {
                return res.json({ id: existing.rows[0].id });
            }

            // Jika belum ada, buat conversation baru
            return await db.transaction(async (tx) => {
                const [newConv] = await tx.insert(chatConversations).values({
                    type: 'direct',
                    createdBy: currentUserId,
                    lastMessageAt: new Date(),
                }).returning();

                await tx.insert(chatParticipants).values([
                    { conversationId: newConv.id, userId: currentUserId, role: 'member' },
                    { conversationId: newConv.id, userId: targetUserId, role: 'member' },
                ]);

                return res.status(201).json({ id: newConv.id });
            });
        } catch (error: any) {
            console.error("ChatController.getOrCreateDirectConversation error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/chat/groups
    // Buat grup baru
    async createGroup(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            const { title, participantIds, projectId } = req.body;
            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });
            if (!title || !title.trim()) return res.status(400).json({ error: "Judul grup wajib diisi" });

            const members = Array.from(new Set([currentUserId, ...(participantIds || [])]));

            return await db.transaction(async (tx) => {
                const [newGroup] = await tx.insert(chatConversations).values({
                    type: 'group',
                    title: title.trim(),
                    createdBy: currentUserId,
                    projectId: projectId || null,
                    lastMessageAt: new Date(),
                }).returning();

                const participantRows = members.map(userId => ({
                    conversationId: newGroup.id,
                    userId,
                    role: userId === currentUserId ? 'admin' : 'member',
                }));

                await tx.insert(chatParticipants).values(participantRows);

                // Tambahkan pesan sambutan sistem
                await tx.insert(chatMessages).values({
                    conversationId: newGroup.id,
                    senderId: currentUserId,
                    content: `Grup "${title.trim()}" telah dibuat.`,
                });

                return res.status(201).json(newGroup);
            });
        } catch (error: any) {
            console.error("ChatController.createGroup error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/chat/conversations/:id/messages
    // Ambil riwayat pesan dalam satu percakapan
    async getMessages(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            const conversationId = req.params.id;
            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

            // Cek apakah user adalah partisipan percakapan ini
            const membership = await db.query.chatParticipants.findFirst({
                where: and(
                    eq(chatParticipants.conversationId, conversationId as any),
                    eq(chatParticipants.userId, currentUserId)
                ),
            });

            if (!membership) {
                return res.status(403).json({ error: "Anda bukan partisipan dalam percakapan ini" });
            }

            // Ambil pesan percakapan
            const messages = await db.query.chatMessages.findMany({
                where: eq(chatMessages.conversationId, conversationId as any),
                orderBy: (m, { asc }) => [asc(m.createdAt)],
                limit: 100,
                with: {
                    sender: {
                        columns: {
                            id: true,
                            name: true,
                            avatarInitials: true,
                            role: true,
                        }
                    },
                    replyTo: {
                        columns: {
                            id: true,
                            content: true,
                            senderId: true,
                        },
                        with: {
                            sender: {
                                columns: {
                                    id: true,
                                    name: true,
                                }
                            }
                        }
                    }
                }
            });

            // Tandai sudah dibaca untuk user saat ini
            await db
                .update(chatParticipants)
                .set({ lastReadAt: new Date() })
                .where(and(
                    eq(chatParticipants.conversationId, conversationId as any),
                    eq(chatParticipants.userId, currentUserId)
                ));

            res.json(messages);
        } catch (error: any) {
            console.error("ChatController.getMessages error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // POST /api/chat/conversations/:id/messages
    // Kirim pesan ke percakapan
    async sendMessage(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            const conversationId = req.params.id;
            const { content, attachmentUrl, attachmentType, attachmentName, replyToId } = req.body;

            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });
            if (!content || !content.trim()) {
                if (!attachmentUrl) {
                    return res.status(400).json({ error: "Pesan atau lampiran tidak boleh kosong" });
                }
            }

            // Cek partisipan
            const membership = await db.query.chatParticipants.findFirst({
                where: and(
                    eq(chatParticipants.conversationId, conversationId as any),
                    eq(chatParticipants.userId, currentUserId)
                ),
            });

            if (!membership) {
                return res.status(403).json({ error: "Anda bukan partisipan dalam percakapan ini" });
            }

            return await db.transaction(async (tx) => {
                const now = new Date();
                const [newMessage] = await tx.insert(chatMessages).values({
                    conversationId: conversationId as any,
                    senderId: currentUserId,
                    content: (content || '').trim(),
                    attachmentUrl: attachmentUrl || null,
                    attachmentType: attachmentType || null,
                    attachmentName: attachmentName || null,
                    replyToId: replyToId || null,
                    createdAt: now,
                    updatedAt: now,
                }).returning();

                // Perbarui lastMessageAt di percakapan
                await tx
                    .update(chatConversations)
                    .set({ lastMessageAt: now, updatedAt: now })
                    .where(eq(chatConversations.id, conversationId as any));

                // Perbarui lastReadAt pengirim
                await tx
                    .update(chatParticipants)
                    .set({ lastReadAt: now })
                    .where(and(
                        eq(chatParticipants.conversationId, conversationId as any),
                        eq(chatParticipants.userId, currentUserId)
                    ));

                // Fetch pesan lengkap dengan detail sender untuk dikembalikan
                const completeMessage = await tx.query.chatMessages.findFirst({
                    where: eq(chatMessages.id, newMessage.id),
                    with: {
                        sender: {
                            columns: {
                                id: true,
                                name: true,
                                avatarInitials: true,
                                role: true,
                            }
                        }
                    }
                });

                return res.status(201).json(completeMessage);
            });
        } catch (error: any) {
            console.error("ChatController.sendMessage error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/chat/unread-summary
    // Ambil total pesan belum dibaca terpisah: group dan personal
    async getUnreadSummary(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

            const result = await db.execute(sql`
                SELECT 
                    c.type,
                    COUNT(m.id) as unread_count
                FROM chat_participants p
                JOIN chat_conversations c ON p.conversation_id = c.id
                JOIN chat_messages m ON m.conversation_id = c.id
                WHERE p.user_id = ${currentUserId}
                  AND m.sender_id != ${currentUserId}
                  AND m.created_at > p.last_read_at
                GROUP BY c.type;
            `);

            let directCount = 0;
            let groupCount = 0;

            if (result.rows) {
                for (const row of result.rows as any[]) {
                    if (row.type === 'direct') directCount = Number(row.unread_count) || 0;
                    if (row.type === 'group') groupCount = Number(row.unread_count) || 0;
                }
            }

            res.json({
                direct: directCount,
                group: groupCount,
                total: directCount + groupCount,
            });
        } catch (error: any) {
            console.error("ChatController.getUnreadSummary error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // GET /api/chat/users
    // Ambil daftar personil aktif untuk memulai obrolan personal
    async getUsersForChat(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            const activeUsers = await db.query.users.findMany({
                where: and(
                    ne(users.status, 'disabled'),
                    ne(users.id, currentUserId || '')
                ),
                columns: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    avatarInitials: true,
                    image: true,
                },
                orderBy: (u, { asc }) => [asc(u.name)],
            });

            res.json(activeUsers);
        } catch (error: any) {
            console.error("ChatController.getUsersForChat error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // DELETE /api/chat/conversations/:id
    // Hapus obrolan (untuk group: admin grup / sistem admin; untuk direct: partisipan manapun)
    async deleteConversation(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            const conversationId = req.params.id;
            const isAdmin = req.user?.role === 'admin';
            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

            const conv = await db.query.chatConversations.findFirst({
                where: eq(chatConversations.id, conversationId as any),
                with: {
                    participants: true,
                }
            });

            if (!conv) return res.status(404).json({ error: "Percakapan tidak ditemukan" });

            const isParticipant = conv.participants.some(p => p.userId === currentUserId);
            if (!isParticipant && !isAdmin) {
                return res.status(403).json({ error: "Anda tidak memiliki akses ke percakapan ini" });
            }

            // Jika group chat dan bukan general group: hanya creator, admin grup, atau system admin yang bisa hapus
            if (conv.type === 'group') {
                const myParticipant = conv.participants.find(p => p.userId === currentUserId);
                const canDeleteGroup = isAdmin || conv.createdBy === currentUserId || myParticipant?.role === 'admin';
                if (!canDeleteGroup) {
                    return res.status(403).json({ error: "Hanya pembuat atau admin grup yang dapat menghapus grup ini" });
                }
            }

            // Hapus percakapan (cascade akan otomatis hapus participants dan messages)
            await db.delete(chatConversations).where(eq(chatConversations.id, conversationId as any));

            console.log(`[chat] Conversation ${conversationId} deleted by ${currentUserId}`);
            res.json({ success: true, message: "Percakapan berhasil dihapus" });
        } catch (error: any) {
            console.error("ChatController.deleteConversation error:", error);
            res.status(500).json({ error: error.message });
        }
    },

    // DELETE /api/chat/messages/:id
    // Hapus pesan spesifik (pengirim pesan atau admin sistem)
    async deleteMessage(req: Request, res: Response) {
        try {
            const currentUserId = req.user?.id;
            const messageId = req.params.id;
            const isAdmin = req.user?.role === 'admin';
            if (!currentUserId) return res.status(401).json({ error: "Unauthorized" });

            const msg = await db.query.chatMessages.findFirst({
                where: eq(chatMessages.id, messageId as any),
            });

            if (!msg) return res.status(404).json({ error: "Pesan tidak ditemukan" });

            if (msg.senderId !== currentUserId && !isAdmin) {
                return res.status(403).json({ error: "Anda hanya dapat menghapus pesan yang Anda kirim sendiri" });
            }

            await db.delete(chatMessages).where(eq(chatMessages.id, messageId as any));

            res.json({ success: true, message: "Pesan berhasil dihapus" });
        } catch (error: any) {
            console.error("ChatController.deleteMessage error:", error);
            res.status(500).json({ error: error.message });
        }
    }
};
