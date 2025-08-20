import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

// Initialize Neon connection
const sql = neon(process.env.DATABASE_URL);

// Database initialization function
export async function initializeDatabase() {
  try {
    // Cek apakah tabel voters sudah ada
    const tablesExist = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'voters'
      )
    `;
    
    // Jika tabel sudah ada, jangan hapus data yang sudah ada
    if (!tablesExist[0].exists) {
      // Hapus tabel lama hanya jika belum ada tabel
      await sql`DROP TABLE IF EXISTS feedback CASCADE`;
      await sql`DROP TABLE IF EXISTS votes CASCADE`;
      await sql`DROP TABLE IF EXISTS voting_sessions CASCADE`;
      await sql`DROP TABLE IF EXISTS voters CASCADE`;
    }

    // Create voters table - hanya menyimpan email untuk verifikasi responden
    await sql`
      CREATE TABLE IF NOT EXISTS voters (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        has_voted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create integrated_assessments table - menggabungkan votes dan feedback
    await sql`
      CREATE TABLE IF NOT EXISTS integrated_assessments (
        id SERIAL PRIMARY KEY,
        voter_id INTEGER NOT NULL,
        candidate_id TEXT NOT NULL,
        aspect_scores JSONB NOT NULL,
        kesan TEXT,
        kritik TEXT,
        saran TEXT,
        is_complete BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE,
        UNIQUE(voter_id, candidate_id)
      )
    `;

    // Create voting_sessions table untuk melacak progres voting
    await sql`
      CREATE TABLE IF NOT EXISTS voting_sessions (
        id SERIAL PRIMARY KEY,
        voter_id INTEGER NOT NULL,
        is_complete BOOLEAN DEFAULT FALSE,
        total_candidates INTEGER DEFAULT 0,
        completed_candidates INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voter_id) REFERENCES voters(id) ON DELETE CASCADE,
        UNIQUE(voter_id)
      )
    `;

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

// Voter operations
export async function createVoter(email) {
  try {
    const result = await sql`
      INSERT INTO voters (email, has_voted)
      VALUES (${email}, false)
      ON CONFLICT (email) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    return result[0];
  } catch (error) {
    console.error("Error creating voter:", error);
    throw error;
  }
}

export async function getVoter(email) {
  try {
    const result = await sql`
      SELECT * FROM voters WHERE email = ${email}
    `;
    return result[0] || null;
  } catch (error) {
    console.error("Error getting voter:", error);
    throw error;
  }
}

// Integrated assessment operations
export async function saveIntegratedAssessment(
  voterEmail,
  aspectScores,
  kesan = null,
  kritik = null,
  saran = null
) {
  try {
    // Dapatkan voter_id dari email
    const voter = await getVoter(voterEmail);
    if (!voter) {
      throw new Error("Voter not found");
    }
    
    // Update status has_voted di tabel voters
    await sql`
      UPDATE voters
      SET has_voted = true
      WHERE id = ${voter.id}
    `;
    
    // Simpan penilaian terintegrasi untuk setiap kandidat
    const results = [];
    
    for (const [candidateId, candidateScores] of Object.entries(aspectScores)) {
      const result = await sql`
        INSERT INTO integrated_assessments (
          voter_id, 
          candidate_id, 
          aspect_scores, 
          kesan, 
          kritik, 
          saran,
          is_complete
        )
        VALUES (
          ${voter.id}, 
          ${candidateId}, 
          ${JSON.stringify(candidateScores)}, 
          ${kesan}, 
          ${kritik}, 
          ${saran},
          true
        )
        ON CONFLICT (voter_id, candidate_id) DO UPDATE SET
          aspect_scores = EXCLUDED.aspect_scores,
          kesan = EXCLUDED.kesan,
          kritik = EXCLUDED.kritik,
          saran = EXCLUDED.saran,
          is_complete = EXCLUDED.is_complete,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
      results.push(result[0]);
    }
    
    return results;
  } catch (error) {
    console.error("Error saving integrated assessment:", error);
    throw error;
  }
}

export async function getVoterAssessments(voterEmail) {
  try {
    // Dapatkan voter_id dari email
    const voter = await getVoter(voterEmail);
    if (!voter) {
      return [];
    }
    
    const result = await sql`
      SELECT * FROM integrated_assessments WHERE voter_id = ${voter.id}
    `;
    return result;
  } catch (error) {
    console.error("Error getting voter assessments:", error);
    throw error;
  }
}

export async function getAllAssessments() {
  try {
    const result = await sql`
      SELECT * FROM integrated_assessments
    `;
    return result;
  } catch (error) {
    console.error("Error getting all assessments:", error);
    throw error;
  }
}

// Voting session operations
export async function saveVotingSession(voterEmail, sessionData) {
  try {
    const {
      is_complete: isComplete,
      total_candidates: totalCandidates,
      completed_candidates: completedCandidates
    } = sessionData;

    // Dapatkan voter_id dari email
    const voter = await getVoter(voterEmail);
    if (!voter) {
      throw new Error("Voter not found");
    }

    const result = await sql`
      INSERT INTO voting_sessions (
        voter_id, is_complete, 
        total_candidates, completed_candidates
      )
      VALUES (
        ${voter.id}, ${isComplete},
        ${totalCandidates}, ${completedCandidates}
      )
      ON CONFLICT (voter_id) DO UPDATE SET
        is_complete = EXCLUDED.is_complete,
        total_candidates = EXCLUDED.total_candidates,
        completed_candidates = EXCLUDED.completed_candidates,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    return result[0];
  } catch (error) {
    console.error("Error saving voting session:", error);
    throw error;
  }
}

export async function getVotingSession(voterEmail) {
  try {
    // Dapatkan voter_id dari email
    const voter = await getVoter(voterEmail);
    if (!voter) {
      return null;
    }
    
    const result = await sql`
      SELECT * FROM voting_sessions WHERE voter_id = ${voter.id}
    `;
    return result[0] || null;
  } catch (error) {
    console.error("Error getting voting session:", error);
    throw error;
  }
}

// Statistics operations
export async function getVotingStatistics() {
  try {
    // Get all assessments
    const allAssessments = await getAllAssessments();

    if (allAssessments.length === 0) {
      return {
        totalVoters: 0,
        completeVotes: 0,
        partialVotes: 0,
        candidateStats: [],
      };
    }

    // Count unique voters
    const uniqueVoters = new Set(allAssessments.map((assessment) => assessment.voter_id));
    const totalVoters = uniqueVoters.size;

    // Group assessments by candidate for statistics
    const candidateStats = {};

    allAssessments.forEach((assessment) => {
      if (!candidateStats[assessment.candidate_id]) {
        candidateStats[assessment.candidate_id] = {
          candidate_id: assessment.candidate_id,
          total_votes: 0,
          valid_votes: 0,
          scores: [],
        };
      }

      candidateStats[assessment.candidate_id].total_votes++;
      candidateStats[assessment.candidate_id].valid_votes++;

      // Calculate weighted score based on aspects from data/candidates.js
      const aspectScores = assessment.aspect_scores;
      if (aspectScores && typeof aspectScores === "object") {
        // Use hardcoded aspects instead of dynamic import
        const aspects = [
          { name: "Kejujuran", weight: 15 },
          { name: "Loyalitas", weight: 15 },
          { name: "Penyelesaian pekerjaan", weight: 15 },
          { name: "Kualitas pekerjaan", weight: 15 },
          { name: "Kerjasama", weight: 10 },
          { name: "Pengembangan diri", weight: 10 },
          { name: "Komunikasi", weight: 10 },
          { name: "Percaya diri", weight: 10 },
        ];

        // Collect all valid aspect scores (non-zero)
        const validAspectScores = [];

        // First, collect all valid scores without applying weights
        aspects.forEach((aspect) => {
          // Try to match aspect name case-insensitively
          const aspectKey = Object.keys(aspectScores).find(
            (key) => key.toLowerCase() === aspect.name.toLowerCase()
          );

          if (aspectKey) {
            const value = parseFloat(aspectScores[aspectKey]) || 0;
            if (value > 0) {
              // Only include non-zero scores
              validAspectScores.push({
                value: value,
                weight: aspect.weight,
              });
            }
          }
        });

        // If we have valid scores, calculate the weighted average
        if (validAspectScores.length > 0) {
          // Calculate the raw score (unweighted average of all valid scores)
          const rawScore =
            validAspectScores.reduce((sum, item) => sum + item.value, 0) /
            validAspectScores.length;

          // Apply weights to the average score
          let weightedScore = validAspectScores.reduce(
            (sum, item) => sum + rawScore * (item.weight / 100),
            0
          );

          // Ensure the weighted score is within 0-100 range
          weightedScore = Math.min(Math.max(weightedScore, 0), 100);

          // Add the weighted score to the candidate's scores
          candidateStats[assessment.candidate_id].scores.push(weightedScore);
        }
      }
    });

    // Calculate average scores for each candidate
    Object.values(candidateStats).forEach((candidate) => {
      if (candidate.scores.length > 0) {
        candidate.average_score =
          candidate.scores.reduce((sum, score) => sum + score, 0) /
          candidate.scores.length;
      } else {
        candidate.average_score = 0;
      }
      delete candidate.scores; // Remove the scores array from the final output
    });

    return {
      totalVoters,
      candidateStats: Object.values(candidateStats),
    };
  } catch (error) {
    console.error("Error getting voting statistics:", error);
    return {
      totalVoters: 0,
      completeVotes: 0,
      partialVotes: 0,
      candidateStats: [],
    };
  }
}

// Fungsi untuk mendapatkan semua feedback dari tabel integrated_assessments
export async function getAllFeedback() {
  try {
    const result = await sql`
      SELECT ia.voter_id, ia.kesan, ia.kritik, ia.saran, ia.created_at, ia.updated_at, v.email as voter_email
      FROM integrated_assessments ia
      JOIN voters v ON ia.voter_id = v.id
      ORDER BY ia.updated_at DESC
    `;
    return result;
  } catch (error) {
    console.error("Error getting all feedback:", error);
    throw error;
  }
}

export { sql };
