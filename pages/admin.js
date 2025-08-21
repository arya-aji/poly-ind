import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import RadarChart from "../components/RadarChart";
import { formatAspectDataForRadarChart } from "../lib/chartUtils";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [activeTab, setActiveTab] = useState("statistics");
  const [assessments, setAssessments] = useState([]);
  const [aspectData, setAspectData] = useState([]);
  const [respondents, setRespondents] = useState([]);
  const [filteredRespondents, setFilteredRespondents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: 'registered_at', direction: 'desc' });

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
  
  // Function to sort respondents
  const sortedRespondents = (respondentsArray) => {
    if (!sortConfig.key) return respondentsArray;
    
    return [...respondentsArray].sort((a, b) => {
      if (a[sortConfig.key] === null) return 1;
      if (b[sortConfig.key] === null) return -1;
      
      let comparison = 0;
      if (sortConfig.key === 'email') {
        comparison = a[sortConfig.key].localeCompare(b[sortConfig.key]);
      } else if (sortConfig.key === 'registered_at' || sortConfig.key === 'last_updated' || sortConfig.key === 'last_assessment_time') {
        const dateA = new Date(a[sortConfig.key]);
        const dateB = new Date(b[sortConfig.key]);
        comparison = dateA - dateB;
      } else if (sortConfig.key === 'assessed_candidates' || sortConfig.key === 'complete_assessments') {
        // Pastikan nilai diperlakukan sebagai angka
        comparison = parseInt(a[sortConfig.key]) - parseInt(b[sortConfig.key]);
      } else {
        comparison = a[sortConfig.key] - b[sortConfig.key];
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };
  
  // Function to request sort
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Update filtered respondents when respondents, search term, or sort config changes
  useEffect(() => {
    let filtered = respondents;
    
    console.log("Filtering respondents:", { count: respondents.length, respondents });
    
    if (searchTerm.trim() !== "") {
      filtered = respondents.filter(respondent => 
        respondent.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredRespondents(sortedRespondents(filtered));
  }, [respondents, searchTerm, sortConfig]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch statistics
      console.log("Fetching statistics data...");
      const statsResponse = await fetch("/api/votes?action=statistics");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log("Statistics data received:", statsData);
        setStatistics(statsData);
      } else {
        console.error("Failed to fetch statistics:", statsResponse.status);
        setStatistics({ totalVoters: 0, completeVotes: 0 });
      }

      // Fetch feedback
      console.log("Fetching feedback data...");
      const feedbackResponse = await fetch("/api/votes?action=all-feedback");
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        setFeedback(Array.isArray(feedbackData) ? feedbackData : []);
      } else {
        console.error("Failed to fetch feedback:", feedbackResponse.status);
        setFeedback([]);
      }
      
      // Fetch respondents
      console.log("Fetching respondents data...");
      const respondentsResponse = await fetch("/api/votes?action=all-respondents");
      if (respondentsResponse.ok) {
        const respondentsData = await respondentsResponse.json();
        console.log("Respondents data received:", { count: respondentsData.length, data: respondentsData });
        
        if (Array.isArray(respondentsData) && respondentsData.length > 0) {
          setRespondents(respondentsData);
          console.log("Respondents state updated with data");
        } else {
          console.warn("Respondents data is empty or not an array");
          setRespondents([]);
        }
      } else {
        console.error("Failed to fetch respondents:", respondentsResponse.status);
        setRespondents([]);
      }

      // Fetch all assessments for radar chart
      console.log("Fetching assessments data...");
      const assessmentsResponse = await fetch(
        "/api/votes?action=all-assessments"
      );
      if (assessmentsResponse.ok) {
        const assessmentsData = await assessmentsResponse.json();
        console.log("Assessments data:", assessmentsData);

        // Ensure assessments is an array
        const validAssessments = Array.isArray(assessmentsData.assessments)
          ? assessmentsData.assessments
          : [];

        setAssessments(validAssessments);

        // Format aspect data for radar chart
        const formattedAspectData =
          formatAspectDataForRadarChart(validAssessments);
        console.log("Formatted aspect data:", formattedAspectData);
        setAspectData(formattedAspectData);
      } else {
        console.error(
          "Failed to fetch assessments:",
          assessmentsResponse.status
        );
        setAssessments([]);
        setAspectData([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Terjadi kesalahan saat mengambil data.");
      setStatistics({ totalVoters: 0, completeVotes: 0 });
      setAssessments([]);
      setAspectData([]);
      setFeedback([]);
      setRespondents([]);
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
        <Head>
          <title>Admin Panel | BERAKHLAK 360</title>
          <meta
            name="description"
            content="Panel admin untuk sistem penilaian BERAKHLAK 360"
          />
        </Head>
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
        <Head>
          <title>Admin Panel | BERAKHLAK 360</title>
          <meta
            name="description"
            content="Panel admin untuk sistem penilaian BERAKHLAK 360"
          />
        </Head>
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
      <Head>
        <title>Admin Panel | BERAKHLAK 360</title>
        <meta
          name="description"
          content="Panel admin untuk sistem penilaian BERAKHLAK 360"
        />
      </Head>
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
              onClick={() => setActiveTab("respondents")}
              className={`py-2 px-4 font-medium ${
                activeTab === "respondents"
                  ? "text-cyan-600 border-b-2 border-cyan-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Daftar Responden
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-100">
                      <p className="text-sm text-gray-500 mb-1">Total Responden</p>
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
                  </div>
                </div>

                {/* Radar Chart untuk menampilkan nilai rata-rata aspek */}
                <div className="card mt-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Nilai Rata-rata Aspek Penilaian
                  </h2>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      Grafik di bawah ini menampilkan nilai rata-rata dari 11
                      aspek penilaian BERAKHLAK 360.
                    </p>
                  </div>
                  {aspectData.length > 0 ? (
                    <>
                      {/* <div className="mb-4 p-2 bg-blue-50 rounded">
                        <p className="text-sm text-blue-700">Debug: {JSON.stringify(aspectData.map(item => ({ name: item.name, score: item.averageScore })))}</p>
                      </div> */}
                      <RadarChart aspectData={aspectData} />
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Belum ada data penilaian yang tersedia.
                    </div>
                  )}

                  {/* Tabel nilai rata-rata aspek */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Detail Nilai Rata-rata Aspek
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Aspek
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Nilai Rata-rata
                            </th>
                            <th
                              scope="col"
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              Deskripsi
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {aspectData.map((aspect, index) => (
                            <tr
                              key={index}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {aspect.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {aspect.averageScore.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {aspect.description}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "respondents" && (
              <div className="space-y-6">
                <div className="card">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    Daftar Responden
                  </h2>
                  
                  <div className="mb-4">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
                      <p className="text-sm text-gray-600 mb-2 md:mb-0">
                        Total responden: <span className="font-semibold">{respondents.length}</span>
                        {searchTerm && (
                          <span className="ml-2">
                            (Menampilkan {filteredRespondents.length} hasil pencarian)
                          </span>
                        )}
                      </p>
                      <button
                        onClick={() => {
                          // Fungsi untuk mengekspor data ke CSV
                          const headers = ['Email', 'Waktu Registrasi', 'Terakhir Diperbarui', 'Status Voting', 'Kandidat Dinilai', 'Penilaian Lengkap'];
                          const csvData = filteredRespondents.map(r => [
                            r.email,
                            new Date(r.registered_at).toLocaleString('id-ID'),
                            new Date(r.last_updated).toLocaleString('id-ID'),
                            r.has_voted ? 'Sudah voting' : 'Belum voting',
                            parseInt(r.assessed_candidates) || 0,
                            parseInt(r.complete_assessments) || 0
                          ]);
                          
                          const csvContent = [
                            headers.join(','),
                            ...csvData.map(row => row.join(','))
                          ].join('\n');
                          
                          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.setAttribute('href', url);
                          link.setAttribute('download', `responden_${new Date().toISOString().slice(0, 10)}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 transition-colors duration-200 text-sm font-medium"
                        disabled={filteredRespondents.length === 0}
                      >
                        Ekspor ke CSV
                      </button>
                    </div>
                    <div className="flex w-full md:w-1/3">
                      <input
                        type="text"
                        placeholder="Cari email responden..."
                        className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 focus:outline-none"
                          title="Reset pencarian"
                        >
                          <span className="text-gray-500">×</span>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                      <p className="mt-2 text-gray-500">Memuat data responden...</p>
                    </div>
                  ) : filteredRespondents && filteredRespondents.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                              <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('email')}
                              >
                                Email
                                {sortConfig.key === 'email' && (
                                  <span className="ml-1">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('registered_at')}
                              >
                                Waktu Registrasi
                                {sortConfig.key === 'registered_at' && (
                                  <span className="ml-1">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('last_assessment_time')}
                              >
                                Terakhir Diperbarui
                                {sortConfig.key === 'last_assessment_time' && (
                                  <span className="ml-1">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('has_voted')}
                              >
                                Status Voting
                                {sortConfig.key === 'has_voted' && (
                                  <span className="ml-1">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('assessed_candidates')}
                              >
                                Kandidat Dinilai
                                {sortConfig.key === 'assessed_candidates' && (
                                  <span className="ml-1">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                              <th 
                                scope="col" 
                                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                onClick={() => requestSort('complete_assessments')}
                              >
                                Penilaian Lengkap
                                {sortConfig.key === 'complete_assessments' && (
                                  <span className="ml-1">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </th>
                            </tr>
                          </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredRespondents.map((respondent, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {respondent.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(respondent.registered_at).toLocaleString('id-ID')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {respondent.last_assessment_time ? 
                                  new Date(respondent.last_assessment_time).toLocaleString('id-ID') : 
                                  "Belum ada penilaian"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                  <span 
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${respondent.has_voted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                                    title={respondent.has_voted ? "Responden telah melakukan voting" : "Responden belum melakukan voting"}
                                  >
                                    {respondent.has_voted ? "Sudah voting" : "Belum voting"}
                                  </span>
                                </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <span 
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${parseInt(respondent.assessed_candidates) > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}
                                    title={`Responden telah menilai ${parseInt(respondent.assessed_candidates) || 0} kandidat`}
                                  >
                                    {parseInt(respondent.assessed_candidates) || 0}
                                  </span>
                                </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                  <span 
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${parseInt(respondent.complete_assessments) > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                                    title={`Responden telah menyelesaikan ${parseInt(respondent.complete_assessments) || 0} penilaian lengkap`}
                                  >
                                    {parseInt(respondent.complete_assessments) || 0}
                                  </span>
                                </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? 
                        "Tidak ada responden yang cocok dengan pencarian." : 
                        "Belum ada data responden yang tersedia."}
                    </div>
                  )}
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
                                Anonymous
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
                                {new Date(item.created_at).toLocaleDateString(
                                  "id-ID"
                                )}
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
