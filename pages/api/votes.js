import {
  createVoter,
  getVoter,
  saveIntegratedAssessment,
  getVoterAssessments,
  getAllAssessments,
  saveVotingSession,
  getVotingSession,
  getAllFeedback,
  getVotingStatistics,
  getAllRespondents,
} from "../../lib/db";

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case "GET":
        await handleGet(req, res);
        break;
      case "POST":
        await handlePost(req, res);
        break;
      case "PUT":
        await handlePut(req, res);
        break;
      default:
        res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
}

async function handleGet(req, res) {
  const { action, email, candidateId } = req.query;

  switch (action) {
    case "voter-assessments":
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const voterAssessments = await getVoterAssessments(email);
      const votingSession = await getVotingSession(email);
      res.status(200).json({ assessments: voterAssessments, session: votingSession });
      break;

    case "all-assessments":
      try {
        const allAssessments = await getAllAssessments();
        console.log("API - all-assessments response:", { count: allAssessments.length });
        
        // Tambahkan debugging info
        const debugInfo = {
          assessmentsCount: allAssessments.length,
          hasAspectScores: allAssessments.filter(a => a.aspect_scores && typeof a.aspect_scores === 'object').length,
          sampleData: allAssessments.length > 0 ? allAssessments[0] : null
        };
        console.log("Debug info:", debugInfo);
        
        res.status(200).json({ 
          assessments: allAssessments,
          debug: debugInfo
        });
      } catch (error) {
        console.error("Error getting all assessments:", error);
        res.status(500).json({ message: "Error getting all assessments", error: error.message });
      }
      break;
      
    case "debug-data":
      try {
        const allAssessments = await getAllAssessments();
        const aspects = await import("../../data/candidates.js").then(m => m.aspects);
        
        res.status(200).json({
          assessmentsCount: allAssessments.length,
          aspects: aspects,
          sampleAssessment: allAssessments.length > 0 ? allAssessments[0] : null
        });
      } catch (error) {
        console.error("Error getting debug data:", error);
        res.status(500).json({ message: "Error getting debug data", error: error.message });
      }
      break;
      
    case "statistics":
      try {
        console.log("API - Fetching voting statistics");
        const statistics = await getVotingStatistics();
        console.log("API - Statistics fetched successfully:", {
          totalVoters: statistics.totalVoters,
          candidatesCount: statistics.candidateStats?.length || 0
        });
        
        // Ensure we always return a valid response structure
        const safeResponse = {
          totalVoters: statistics.totalVoters || 0,
          candidateStats: Array.isArray(statistics.candidateStats) ? statistics.candidateStats : []
        };
        
        res.status(200).json(safeResponse);
      } catch (error) {
        console.error("Error getting statistics:", error);
        // Return a valid empty response structure instead of error
        res.status(200).json({
          totalVoters: 0,
          candidateStats: [],
          error: error.message
        });
      }
      break;
      
    case "all-feedback":
      try {
        const allFeedback = await getAllFeedback();
        res.status(200).json(allFeedback);
      } catch (error) {
        console.error("Error getting all feedback:", error);
        res.status(500).json({ message: "Error getting all feedback", error: error.message });
      }
      break;
      
    case "all-respondents":
      try {
        console.log("API - Fetching all respondents");
        const respondents = await getAllRespondents();
        console.log(`API - Retrieved ${respondents.length} respondents`);
        res.status(200).json(respondents);
      } catch (error) {
        console.error("Error getting all respondents:", error);
        res.status(500).json({ message: "Error getting all respondents", error: error.message });
      }
      break;

    case "candidateAssessments":
      if (!candidateId) {
        return res.status(400).json({ message: "Candidate ID is required" });
      }
      try {
        const assessments = await getAllAssessments();
        // Ensure assessments is an array before filtering
        const assessmentsArray = Array.isArray(assessments) ? assessments : [];
        
        // Filter assessments that have scores for this candidate
        const filteredAssessments = assessmentsArray.filter(assessment => {
          const scores = assessment.aspect_scores;
          return scores && scores[candidateId];
        });
        
        res.status(200).json(filteredAssessments);
      } catch (error) {
        console.error("Error getting candidate assessments:", error);
        res
          .status(500)
          .json({
            message: "Error getting candidate assessments",
            error: error.message,
          });
      }
      break;

    case "candidateVoters":
      if (!candidateId) {
        return res.status(400).json({ message: "Candidate ID is required" });
      }
      try {
        const assessments = await getAllAssessments();
        // Ensure assessments is an array before filtering
        const assessmentsArray = Array.isArray(assessments) ? assessments : [];

        // Filter assessments for this candidate
        const candidateAssessments = assessmentsArray.filter(assessment => {
          const scores = assessment.aspect_scores;
          return scores && scores[candidateId];
        });

        // Get voter details for each assessment
        const votersWithDetails = await Promise.all(
          candidateAssessments.map(async (assessment) => {
            const voter = await getVoter(assessment.voter_email);
            return {
              ...assessment,
              voter_name: voter ? voter.name : "Unknown",
            };
          })
        );

        res.status(200).json(votersWithDetails);
      } catch (error) {
        console.error("Error getting candidate voters:", error);
        res
          .status(500)
          .json({
            message: "Error getting candidate voters",
            error: error.message,
          });
      }
      break;

    case "voter":
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const voter = await getVoter(email);
      res.status(200).json({ voter });
      break;

    default:
      res.status(400).json({ message: "Invalid action" });
  }
}

async function handlePost(req, res) {
  const { action } = req.query;
  const { name, email, votes, sessionData, feedbackData, password, integratedData } = req.body;

  switch (action) {
    case "verify-admin":
      // Verifikasi password admin
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (password === adminPassword) {
        res.status(200).json({ success: true });
      } else {
        res.status(401).json({ success: false, message: "Password tidak valid" });
      }
      break;
    case "create-voter":
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      try {
        console.log("Creating voter with email:", email);
        const voter = await createVoter(email);
        console.log("Voter created:", voter);
        res.status(201).json({ voter });
      } catch (error) {
        console.error("Error creating voter:", error);
        res.status(500).json({ message: "Failed to create voter", error: error.message });
      }
      break;

    case "submit-integrated-assessment":
      if (!email || !integratedData) {
        return res.status(400).json({
          message: "Email and integrated assessment data are required",
        });
      }

      const { aspectScores, kesan, kritik, saran } = integratedData;
      
      // Save integrated assessment
      const savedAssessment = await saveIntegratedAssessment(
        email,
        aspectScores,
        kesan,
        kritik,
        saran
      );

      // Save voting session if provided
      let session = null;
      if (sessionData) {
        try {
          console.log("Saving voting session with data:", sessionData);
          session = await saveVotingSession(email, sessionData);
          console.log("Voting session saved:", session);
        } catch (error) {
          console.error("Error saving voting session:", error);
        }
      }

      res.status(201).json({
        message: "Integrated assessment submitted successfully",
        assessment: savedAssessment,
        session,
      });
      break;

    default:
      res.status(400).json({ message: "Invalid action" });
  }
}

async function handlePut(req, res) {
  const { action } = req.query;
  const { email, integratedData, sessionData } = req.body;

  switch (action) {
    case "update-integrated-assessment":
      if (!email || !integratedData) {
        return res.status(400).json({
          message: "Email and integrated assessment data are required",
        });
      }

      const { aspectScores, kesan, kritik, saran } = integratedData;
      
      // Update integrated assessment
      const updatedAssessment = await saveIntegratedAssessment(
        email,
        aspectScores,
        kesan,
        kritik,
        saran
      );

      // Update voting session if provided
      let session = null;
      if (sessionData) {
        session = await saveVotingSession(email, sessionData);
      }

      res.status(200).json({
        message: "Integrated assessment updated successfully",
        assessment: updatedAssessment,
        session,
      });
      break;

    default:
      res.status(400).json({ message: "Invalid action" });
  }
}
