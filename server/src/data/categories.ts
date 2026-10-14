export const CATEGORIES = {
    terbitan: {
        id: 'terbitan',
        label: 'Terbitan',
        icon: '📖',
        workflow: 'sequential', // estafet
        types: [
            { id: 'reguler', label: 'Umum / Reguler' },
            { id: 'inkubator', label: 'Inkubator Literasi' },
            { id: 'dak', label: 'DAK Non Fisik' },
            { id: 'terjemahan', label: 'Terjemahan' }
        ],
        typeStages: {
            terjemahan: [
                { id: 'terjemahkan', label: 'Terjemahkan', order: 1, score: 0, perPageScore: 1, pageMultiplier: 10 },
                { id: 'penyuntingan-terjemahan', label: 'Penyuntingan Naskah Terjemahan', order: 2, score: 0, perPageScore: 1, pageMultiplier: 10 }
            ]
        },
        stages: [
            { id: 'naskah',       label: 'Kelengkapan Naskah',                        order: 1,  score: 1, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'surat-terima', label: 'Pembuatan Surat Penerimaan Terbitan',        order: 2,  score: 1, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'sunting',      label: 'Penyuntingan',                               order: 3,  score: 0, perPageScore: 1.5, pageMultiplier: 10 },
            { id: 'tata-letak',   label: 'Tata Letak Naskah',                          order: 4,  score: 0, perPageScore: 1,   pageMultiplier: 10 },
            { id: 'nip',          label: 'Penginputan Nomor Induk Penerbitan',         order: 5,  score: 1, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'sampul',       label: 'Desain Sampul',                              order: 6,  score: 5, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'dummy',        label: 'Pembuatan Dummy',                            order: 7,  score: 1, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'qc',           label: 'Kendali Kualitas',                           order: 8,  score: 5, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'isbn',         label: 'Penerbitan ISBN',                            order: 9,  score: 3, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'dummy-final',  label: 'Pembuatan Dummy Final',                      order: 10, score: 1, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'upload',       label: 'Unggah ke Sipena dan Ipusnas',               order: 11, score: 1, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'sk-terbit',    label: 'Pembuatan Surat Keterangan Terbit',          order: 12, score: 1, perPageScore: 0,   pageMultiplier: 1  },
            { id: 'serah-terima', label: 'Serah Terima Karya Cetak dan Rekam',         order: 13, score: 1, perPageScore: 0,   pageMultiplier: 1  }
        ],
        knowledgeBase: 'https://drive.google.com/file/d/1i-5lT9gTU-KcoPLfIrgYC1lzfXOmZ8it/view'
    },
    medsos: {
        id: 'medsos',
        label: 'Media Sosial',
        icon: '📱',
        workflow: 'parallel',
        types: [
            { id: 'jumat-baca', label: 'Jumat Baca' },
            { id: 'bagi-buku', label: 'Bagi-Bagi Buku' },
            { id: 'medsos-lainnya', label: 'Lainnya' }
        ],
        stages: [
            { id: 'teks',     label: 'Penyusunan Teks',    order: 1, score: 3, perPageScore: 0, pageMultiplier: 1 },
            { id: 'desain',   label: 'Perancangan Desain', order: 2, score: 4, perPageScore: 0, pageMultiplier: 1 },
            { id: 'tinjauan', label: 'Tinjauan Konten',    order: 3, score: 2, perPageScore: 0, pageMultiplier: 1 },
            { id: 'unggah',   label: 'Pengunggahan',       order: 4, score: 1, perPageScore: 0, pageMultiplier: 1 }
        ],
        knowledgeBase: null
    },
    keuangan: {
        id: 'keuangan',
        label: 'Keuangan',
        icon: '💰',
        workflow: 'sequential',
        types: [
            { id: 'gu-ls', label: 'GU atau LS' },
            { id: 'data-keuangan', label: 'Data Keuangan' }
        ],
        stages: [
            { id: 'verifikasi', label: 'Verifikasi dan Validasi Hasil Kegiatan',  order: 1, score: 3, perPageScore: 0, pageMultiplier: 1 },
            { id: 'laporan',    label: 'Laporan Kinerja dan Evaluasi Kegiatan',    order: 2, score: 3, perPageScore: 0, pageMultiplier: 1 }
        ],
        knowledgeBase: null
    },
    promosi: {
        id: 'promosi',
        label: 'Promosi',
        icon: '📣',
        workflow: 'parallel',
        types: [],
        stages: [],
        knowledgeBase: null
    },
    bimtek: {
        id: 'bimtek',
        label: 'Bimbingan Teknis & Kepelatihan',
        icon: '🎓',
        workflow: 'parallel',
        types: [],
        stages: [],
        knowledgeBase: null
    },
    lainnya: {
        id: 'lainnya',
        label: 'Lainnya',
        icon: '📋',
        workflow: 'parallel', // bisa bersamaan
        types: [],  // input manual
        stages: [], // input manual
        knowledgeBase: null
    }
}
