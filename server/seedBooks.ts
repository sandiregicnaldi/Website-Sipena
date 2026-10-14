import { db } from "./src/db";
import { books } from "./src/db/schema";

const initialBooksData = [
  { title: 'Syair Ulama Saleh', authorName: 'Penulis Anonim', category: 'Sastra', color: '#1e293b' },
  { title: 'Alih Bahasa Rapport von het Vernigen', authorName: 'Johannes de Hartogh', category: 'Sejarah', color: '#b91c1c' },
  { title: 'USANA, SAGARA, BANAWA', authorName: 'Pande Putu Abdi Jaya', category: 'Budaya', color: '#1d4ed8' },
  { title: 'Hikayat Tuanku nan Muda Pagaruyung', authorName: 'M. Yusuf', category: 'Sastra', color: '#047857' },
  { title: 'Mari Mengenal Lebih Dekat HATIBALI', authorName: 'Perpusnas Press', category: 'Umum', color: '#6d28d9' },
  { title: 'Babad Diponegoro', authorName: 'Kyai Mojo', category: 'Sejarah', color: '#0f766e' },
  { title: 'Sejarah Nasional Indonesia', authorName: 'Sartono Kartodirdjo', category: 'Sejarah', color: '#c2410c' },
  { title: 'Kesusastraan Melayu Klasik', authorName: 'Liaw Yock Fang', category: 'Sastra', color: '#7c3aed' },
  { title: 'Kitab Primbon Jawa', authorName: 'Kanjeng Pangeran', category: 'Budaya', color: '#0f4c75' },
  { title: 'Serat Centhini', authorName: 'Paku Buwana V', category: 'Sastra', color: '#991b1b' },
  { title: 'Hikayat Merong Mahawangsa', authorName: 'Anonim', category: 'Sastra', color: '#065f46' },
  { title: 'Naskah Kuna Palembang', authorName: 'Tim Perpusnas', category: 'Sejarah', color: '#1e3a8a' },
  { title: 'Tata Bahasa Jawa Kuno', authorName: 'P.J. Zoetmulder', category: 'Pendidikan', color: '#92400e' },
  { title: 'Kumpulan Pantun Melayu', authorName: 'R.O. Winstedt', category: 'Sastra', color: '#3b0764' },
  { title: 'Pararaton (Ken Arok)', authorName: 'Kern & Krom', category: 'Sejarah', color: '#134e4a' },
  { title: 'Kakawin Ramayana', authorName: 'Mpu Yogiswara', category: 'Sastra', color: '#7f1d1d' },
  { title: 'Lontar Usana Bali', authorName: 'Tim Balai Bahasa', category: 'Budaya', color: '#1a2e05' },
  { title: 'Nagarakretagama', authorName: 'Mpu Prapanca', category: 'Sejarah', color: '#0c4a6e' },
  { title: 'Suluk Wujil', authorName: 'Sunan Bonang', category: 'Sastra', color: '#581c87' },
  { title: 'Hikayat Hang Tuah', authorName: 'Anonim', category: 'Sastra', color: '#14532d' },
  { title: 'Sair Perang Menteng', authorName: 'Ali Haji', category: 'Sastra', color: '#1e3a8a' },
  { title: 'Babat Tanah Jawi', authorName: 'Paku Buwana III', category: 'Sejarah', color: '#7c2d12' },
  { title: 'Arjunawiwaha', authorName: 'Mpu Kanwa', category: 'Sastra', color: '#064e3b' },
  { title: 'Desawarnana', authorName: 'Mpu Prapanca', category: 'Sejarah', color: '#312e81' },
  { title: 'Sejarah Melayu', authorName: 'Tun Sri Lanang', category: 'Sejarah', color: '#422006' },
  { title: 'Panji Angreni', authorName: 'Anonim', category: 'Sastra', color: '#0f172a' },
  { title: 'Kutaramanawa', authorName: 'Tim Filologi', category: 'Hukum', color: '#6b21a8' },
  { title: 'Tambo Minangkabau', authorName: 'Tim Peneliti', category: 'Budaya', color: '#166534' },
  { title: 'Undang-Undang Melaka', authorName: 'Anonim', category: 'Hukum', color: '#1e3a5f' },
  { title: 'Cerita Panji Jawa', authorName: 'Poerbatjaraka', category: 'Sastra', color: '#831843' },
  { title: 'Naskah Wangsakerta', authorName: 'Pangeran Wangsakerta', category: 'Sejarah', color: '#365314' },
  { title: 'Hikayat Sri Rama', authorName: 'Anonim', category: 'Sastra', color: '#1c1917' },
  { title: 'Petualangan Si Conat', authorName: 'F.D.J. Pangemanan', category: 'Fiksi', color: '#065f46' },
  { title: 'Kungkang yang Baik Hati', authorName: 'Sutradara', category: 'Anak', color: '#eab308' },
  { title: 'Salah Asuhan', authorName: 'Abdul Muis', category: 'Fiksi', color: '#be123c' },
  { title: 'Nasrun Belajar di Batavia', authorName: 'Hasanuddin', category: 'Fiksi', color: '#0284c7' },
  { title: 'Midun Anak Pemberani', authorName: 'M. Yusuf', category: 'Anak', color: '#0ea5e9' },
];

async function seed() {
  console.log("Seeding books to PostgreSQL...");
  const records = initialBooksData.map((b, idx) => ({
    title: b.title,
    authorName: b.authorName,
    category: b.category,
    year: 2020 + (idx % 6),
    isbn: `978-623-${100 + idx}-${200 + idx}-${idx % 10}`,
    isbnDigital: `978-623-${100 + idx}-${200 + idx}-${idx % 10}-E`,
    coverUrl: null, // Will use color card / fallback
    fileUrl: '/sample.pdf',
    synopsis: `${b.title} adalah karya literatur berharga dalam khazanah ${b.category} Indonesia. Diterbitkan oleh Perpusnas Press sebagai bagian dari pelestarian dan pengayaan literasi naskah nusantara.`,
    ratingAvg: 4.0 + ((idx % 10) * 0.1),
    ratingCount: 5 + (idx * 3),
    downloadCount: 20 + (idx * 7),
    status: 'published',
  }));

  for (const record of records) {
    await db.insert(books).values(record);
  }

  console.log(`Successfully seeded ${records.length} books to PostgreSQL.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Failed to seed books:", err);
  process.exit(1);
});
