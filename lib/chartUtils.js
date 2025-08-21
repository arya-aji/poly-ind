import { aspects } from '../data/candidates';

/**
 * Mengambil dan memformat data aspek penilaian untuk Radar Chart
 * @param {Array} assessments - Array penilaian dari API
 * @returns {Array} - Data yang diformat untuk Radar Chart
 */
export function formatAspectDataForRadarChart(assessments) {
  console.log("Received assessments:", Array.isArray(assessments) ? `${assessments.length} items` : assessments);
  
  // Validasi input
  if (!assessments || !Array.isArray(assessments) || assessments.length === 0) {
    console.log("No valid assessments found, returning zero values");
    return aspects.map(aspect => ({
      name: aspect.name,
      averageScore: 0,
      description: aspect.description
    }));
  }

  // Inisialisasi objek untuk menyimpan total nilai dan jumlah penilaian untuk setiap aspek
  const aspectTotals = {};
  const aspectCounts = {};

  // Inisialisasi dengan semua aspek yang ada
  aspects.forEach(aspect => {
    aspectTotals[aspect.name] = 0;
    aspectCounts[aspect.name] = 0;
  });
  
  console.log("Initialized aspect totals and counts with:", aspects.map(a => a.name));

  // Hitung total nilai dan jumlah penilaian untuk setiap aspek
  assessments.forEach((assessment, index) => {
    console.log(`Processing assessment ${index}:`, assessment);
    const aspectScores = assessment.aspect_scores;
    
    if (aspectScores && typeof aspectScores === 'object') {
      console.log(`Assessment ${index} has aspect_scores:`, aspectScores);
      
      // Periksa struktur data aspect_scores
      // Struktur 1: { candidateId: { aspectName: score, ... }, ... }
      // Struktur 2: { aspectName: score, ... }
      
      // Cek apakah aspect_scores memiliki struktur kandidat
      const hasNestedStructure = Object.values(aspectScores).some(value => 
        value && typeof value === 'object' && !Array.isArray(value)
      );
      
      if (hasNestedStructure) {
        // Struktur 1: { candidateId: { aspectName: score, ... }, ... }
        console.log(`Assessment ${index} has nested structure with candidates`);
        
        // Untuk setiap kandidat dalam penilaian
        Object.entries(aspectScores).forEach(([candidateId, candidateScores]) => {
          console.log(`Processing candidate ${candidateId}:`, candidateScores);
          
          // Untuk setiap nilai aspek dalam penilaian kandidat
          if (candidateScores && typeof candidateScores === 'object') {
            Object.entries(candidateScores).forEach(([aspectName, score]) => {
              console.log(`Processing aspect ${aspectName} with score ${score}`);
              
              // Cari aspek yang sesuai (case insensitive)
              const matchingAspect = aspects.find(
                aspect => aspect.name.toLowerCase() === aspectName.toLowerCase()
              );
              
              if (matchingAspect) {
                console.log(`Found matching aspect: ${matchingAspect.name}`);
                const value = parseFloat(score) || 0;
                if (value > 0) {
                  aspectTotals[matchingAspect.name] += value;
                  aspectCounts[matchingAspect.name]++;
                  console.log(`Updated totals for ${matchingAspect.name}: total=${aspectTotals[matchingAspect.name]}, count=${aspectCounts[matchingAspect.name]}`);
                }
              } else {
                console.log(`No matching aspect found for: ${aspectName}`);
              }
            });
          } else {
            console.log(`Invalid candidateScores for ${candidateId}:`, candidateScores);
          }
        });
      } else {
        // Struktur 2: { aspectName: score, ... }
        console.log(`Assessment ${index} has flat structure without candidates`);
        
        // Langsung proses nilai aspek
        Object.entries(aspectScores).forEach(([aspectName, score]) => {
          console.log(`Processing aspect ${aspectName} with score ${score}`);
          
          // Cari aspek yang sesuai (case insensitive)
          const matchingAspect = aspects.find(
            aspect => aspect.name.toLowerCase() === aspectName.toLowerCase()
          );
          
          if (matchingAspect) {
            console.log(`Found matching aspect: ${matchingAspect.name}`);
            const value = parseFloat(score) || 0;
            if (value > 0) {
              aspectTotals[matchingAspect.name] += value;
              aspectCounts[matchingAspect.name]++;
              console.log(`Updated totals for ${matchingAspect.name}: total=${aspectTotals[matchingAspect.name]}, count=${aspectCounts[matchingAspect.name]}`);
            }
          } else {
            console.log(`No matching aspect found for: ${aspectName}`);
          }
        });
      }
    } else {
      console.log(`Assessment ${index} has no valid aspect_scores:`, aspectScores);
    }
  });

  // Hitung nilai rata-rata untuk setiap aspek
  console.log("Final aspect totals:", aspectTotals);
  console.log("Final aspect counts:", aspectCounts);
  
  const result = aspects.map(aspect => {
    const total = aspectTotals[aspect.name] || 0;
    const count = aspectCounts[aspect.name] || 0;
    const averageScore = count > 0 ? total / count : 0;
    
    console.log(`Calculating average for ${aspect.name}: ${total} / ${count} = ${averageScore}`);
    
    return {
      name: aspect.name,
      averageScore: Math.round(averageScore * 10) / 10, // Round to 1 decimal place
      description: aspect.description
    };
  });
  
  console.log("Final formatted data:", result);
  
  // Validasi output
  if (!result || result.length === 0) {
    console.log("Warning: Empty formatted data, returning default values");
    return aspects.map(aspect => ({
      name: aspect.name,
      averageScore: 0,
      description: aspect.description
    }));
  }
  
  return result;
}