import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [activeTab, setActiveTab] = useState("statistics");
  
  const router = useRouter();

  useEffect(() => {
    // Check if we have a stored auth token
    const authToken = localStorage.getItem("adminAuth");
    if (authToken === "true") {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch statistics
      const statsResponse = await fetch("/api/votes?action=statistics");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStatistics(statsData);
      }

      // Fetch feedback
      const feedbackResponse = await fetch("/api/votes?action=all-feedback");
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        setFeedback(feedbackData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Terjadi kesalahan saat mengambil data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/votes?action=verify-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem("adminAuth", "true");
        setIsAuthenticated(true);
        fetchData();
      } else {
        setError("Password tidak valid. Silakan coba lagi.");
        setLoading(false);
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Terjadi kesalahan saat login. Silakan coba lagi.");
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    setIsAuthenticated(false);
    setStatistics(null);
    setFeedback([]);
  };

  if (loading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center">
        <div className="card p-8 max-w-md w-full">
          <div className="animate-pulse text-center text-cyan-600">
            Memuat...
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center">
        <div className="card p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Admin Panel
          </h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Password Admin
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <button
              type="submit"
              className="w-full btn-primary py-2"
              disabled={loading}
            >
              {loading ? "Memproses..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Admin Panel</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab("statistics")}
              className={`py-2 px-4 font-medium ${
                activeTab === "statistics"
                  ? "text-cyan-600 border-b-2 border-cyan-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Statistik Voting
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`py-2 px-4 font-medium ${
                activeTab === "feedback"
                  ? "text-cyan-600 border-b-2 border-cyan-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Kesan, Kritik & Saran
            </button>
          </div>
        </div>

        {loading ? (
          <div className="card p-8 text-center">
            <div className="animate-pulse text-cyan-600">Memuat data...</div>
          </div>
        ) : (
          <>
            {activeTab === "statistics" && statistics && (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Statistik Voting
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
                      <p className="text-sm text-gray-500 mb-1">Total Voters</p>
                      <p className="text-2xl font-bold text-cyan-700">
                        {statistics.totalVoters || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                      <p className="text-sm text-gray-500 mb-1">
                        Voting Lengkap
                      </p>
                      <p className="text-2xl font-bold text-green-700">
                        {statistics.completeVotes || 0}
                      </p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                      <p className="text-sm text-gray-500 mb-1">
                        Voting Parsial
                      </p>
                      <p className="text-2xl font-bold text-yellow-700">
                        {statistics.partialVotes || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "feedback" && (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Kesan, Kritik, dan Saran
                  </h2>
                  
                  {feedback && feedback.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kesan
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kritik
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Saran
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tanggal
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {feedback.map((item, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {item.voter_email}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="max-h-32 overflow-y-auto">
                                  {item.kesan || "-"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="max-h-32 overflow-y-auto">
                                  {item.kritik || "-"}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="max-h-32 overflow-y-auto">
                                  {item.saran || "-"}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(item.created_at).toLocaleDateString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada data feedback yang tersedia.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}