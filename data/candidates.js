export const districts = {
  'Kandidat': ['Undich Sadewo Sunu, M.Si.']
};

export const aspects = [
  { name: 'Berorientasi Pelayanan', weight: 9, description: 'Kemampuan memberikan pelayanan terbaik kepada stakeholders' },
  { name: 'Akuntabel', weight: 9, description: 'Bertanggung jawab atas tindakan dan keputusan yang diambil' },
  { name: 'Kompeten', weight: 9, description: 'Memiliki pengetahuan dan keterampilan yang sesuai dengan bidang tugas' },
  { name: 'Harmonis', weight: 9, description: 'Menciptakan lingkungan kerja yang saling menghargai dan menghormati' },
  { name: 'Loyal', weight: 9, description: 'Kesetiaan dan komitmen terhadap organisasi dan negara' },
  { name: 'Adaptif', weight: 9, description: 'Kemampuan menyesuaikan diri dengan perubahan dan perkembangan' },
  { name: 'Kolaboratif', weight: 9, description: 'Kemampuan membangun kerjasama yang efektif dengan berbagai pihak' },
  { name: 'Komitmen', weight: 9, description: 'Konsistensi dalam menjalankan tugas dan tanggung jawab' },
  { name: 'Inisiatif Kerja', weight: 9, description: 'Kemampuan mengambil tindakan proaktif tanpa menunggu arahan' },
  { name: 'Kerjasama', weight: 9, description: 'Kemampuan bekerja dalam tim dan mendukung pencapaian tujuan bersama' },
  { name: 'Kepemimpinan', weight: 10, description: 'Kemampuan memimpin, mengarahkan, dan memotivasi tim' }
];

export const getAllCandidates = () => {
  const candidates = [];
  Object.entries(districts).forEach(([district, names]) => {
    names.forEach(name => {
      candidates.push({ name, district });
    });
  });
  return candidates;
};