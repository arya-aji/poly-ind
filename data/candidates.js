export const districts = {
  'Kandidat': ['Undich Sadewo Sunu, M.Si.']
};

export const aspects = [
  { name: 'Kejujuran', weight: 15 },
  { name: 'Loyalitas', weight: 15 },
  { name: 'Penyelesaian pekerjaan', weight: 15 },
  { name: 'Kualitas pekerjaan', weight: 15 },
  { name: 'Kerjasama', weight: 10 },
  { name: 'Pengembangan diri', weight: 10 },
  { name: 'Komunikasi', weight: 10 },
  { name: 'Percaya diri', weight: 10 }
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