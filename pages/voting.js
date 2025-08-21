import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { districts, aspects, getAllCandidates } from "../data/candidates";
import Modal from "../components/Modal";

export default function Voting() {
  const [votes, setVotes] = useState({});
  // Removed abstainedVotes as we're removing the abstain option
  // Removed currentAspectIndex as we'll show all aspects at once
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [feedback, setFeedback] = useState({
    kesan: "",
    kritik: "",
    saran: "",
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [canCloseModal, setCanCloseModal] = useState(false);
  const router = useRouter();
  const candidates = getAllCandidates();

  useEffect(() => {
    const initializeVotingData = async () => {
      // Initialize empty voting state for simplified flow
      const votesMap = {};

      // Initialize votes for the single candidate
      candidates.forEach((candidate) => {
        // Menggunakan candidate.name sebagai kunci untuk konsistensi
        votesMap[candidate.name] = {};
        aspects.forEach((aspect) => {
          votesMap[candidate.name][aspect.name] = 0;
        });
      });

      setVotes(votesMap);
    };

    initializeVotingData();
  }, []);

  // Effect untuk mengatur timer pada modal
  useEffect(() => {
    if (showWelcomeModal) {
      // Set timer 3 detik sebelum modal bisa ditutup
      const timer = setTimeout(() => {
        setCanCloseModal(true);
      }, 3000);

      // Cleanup timer jika komponen unmount
      return () => clearTimeout(timer);
    }
  }, [showWelcomeModal]);

  const handleVoteChange = (candidateName, aspectName, value) => {
    const numValue = parseInt(value);

    setVotes((prev) => ({
      ...prev,
      [candidateName]: {
        ...prev[candidateName],
        [aspectName]: numValue,
      },
    }));
  };

  // Removed handleAbstain function as we're removing the abstain option

  const handleBulkVoteChange = (aspectName, value) => {
    // Set same score for all candidates in current aspect
    const newVotes = { ...votes };
    candidates.forEach((candidate) => {
      if (!newVotes[candidate.name]) {
        newVotes[candidate.name] = {};
      }
      newVotes[candidate.name][aspectName] = parseInt(value);
    });
    setVotes(newVotes);
  };

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Removed getCurrentAspect and isCurrentAspectComplete as we show all aspects

  const getCompletedAspectsCount = () => {
    return aspects.filter((aspect) => {
      return candidates.every((candidate) => {
        const vote = votes[candidate.name]?.[aspect.name];
        return vote !== undefined && vote > 0;
      });
    }).length;
  };

  const isAllComplete = () => getCompletedAspectsCount() === aspects.length;

  const hasAnyVotes = () => {
    return candidates.some((candidate) => {
      return aspects.some((aspect) => {
        const vote = votes[candidate.name]?.[aspect.name];
        return vote !== undefined && vote > 0;
      });
    });
  };

  const hasAnyFeedback = () => {
    return (
      feedback.kesan.trim() !== "" ||
      feedback.kritik.trim() !== "" ||
      feedback.saran.trim() !== ""
    );
  };

  // Removed navigation functions as all aspects are shown at once

  const validateEmail = (email) => {
    // Validasi format email BPS (harus berakhiran @bps.go.id)
    const emailRegex = /^[a-zA-Z0-9._-]+@bps\.go\.id$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    if (!value) {
      setEmailError("Email wajib diisi");
    } else if (!validateEmail(value)) {
      setEmailError("Email harus menggunakan domain @bps.go.id");
    } else {
      setEmailError("");
    }
  };

  // Fungsi handleFeedbackSubmit dihapus karena sekarang menggunakan formulir terpadu

  const handleSubmit = async () => {
    // Validasi email
    if (!email || !validateEmail(email)) {
      alert("Harap masukkan email BPS yang valid sebelum mengirim.");
      return;
    }

    // Validasi apakah ada penilaian yang diberikan
    if (!hasAnyVotes() && !hasAnyFeedback()) {
      alert("Mohon berikan penilaian atau feedback sebelum mengirim.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Buat voter terlebih dahulu sebelum submit votes
      const createVoterResponse = await fetch(
        "/api/votes?action=create-voter",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
          }),
        }
      );

      if (!createVoterResponse.ok) {
        const errorData = await createVoterResponse.json();
        throw new Error(
          `Gagal membuat voter: ${errorData.error || errorData.message}`
        );
      }

      // Prepare integrated data for submission
      const sessionData = {
        voter_email: email, // Email hanya digunakan untuk identifikasi, data disimpan secara anonim
        is_complete: true,
        total_candidates: candidates.length,
        completed_candidates: candidates.length, // All candidates are processed in new flow
      };

      // Prepare aspect scores data
      const aspectScoresData = {};
      candidates.forEach((candidate) => {
        aspectScoresData[candidate.name] = {};
        aspects.forEach((aspect) => {
          aspectScoresData[candidate.name][aspect.name] =
            votes[candidate.name]?.[aspect.name] || 0;
        });
      });

      // Prepare integrated data with both votes and feedback
      const integratedData = {
        aspectScores: aspectScoresData,
        kesan: feedback.kesan,
        kritik: feedback.kritik,
        saran: feedback.saran,
      };

      // Submit integrated data to database using new endpoint
      const response = await fetch(
        "/api/votes?action=submit-integrated-assessment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            integratedData: integratedData,
            sessionData: sessionData,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gagal menyimpan penilaian: ${errorData.error || errorData.message}`
        );
      }

      // Jika request berhasil, tampilkan pesan sukses
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      alert("Terjadi kesalahan saat menyimpan penilaian. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100 flex items-center justify-center">
        <div className="card text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Penilaian Berhasil!
          </h2>
          <p className="text-gray-600 mb-4">
            Terima kasih atas partisipasi Anda dalam penilaian performa Kepala
            BPS Kota Jakarta Pusat.
          </p>
          <p className="text-sm text-gray-500">
            Anda akan diarahkan kembali ke halaman utama...
          </p>
        </div>
      </div>
    );
  }

  const completedCount = getCompletedAspectsCount();
  const progress = (completedCount / aspects.length) * 100;

  const handleCloseWelcomeModal = () => {
    if (canCloseModal) {
      setShowWelcomeModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100">
      <Head>
        <title>Penilaian | BERAKHLAK 360</title>
        <meta
          name="description"
          content="Formulir penilaian performa kepemimpinan Kepala BPS Kota Jakarta Pusat"
        />
      </Head>
      {/* Welcome Modal */}
      <Modal
        isOpen={showWelcomeModal}
        onClose={handleCloseWelcomeModal}
        title="BERAKHLAK 360 - Penilaian Kepala BPS Kota Jakarta Pusat"
      >
        <div className="text-base px-2 py-1">
          <p className="font-medium mb-3">
            Ysh.
            <br />
            Bpk, Ibu, Temen2 keluarga besar BPS Kota Jakarta Pusat
            <br />
            Di tempat
          </p>

          <p className="mb-4 text-justify leading-relaxed">
            Sebagai refleksi diri saya yang diberikan amanah untuk menjadi
            Kepala BPS Kota Jakarta Pusat untuk memimpin temen2 semua dalam
            penyediaan statistik dasar dan juga sebagai bagian dari evaluasi
            progres RB kita, mohon dapat memberikan penilaian atas apa yang
            sudah saya lakukan selama menjabat dan atas progres yang ada di BPS
            Kota Jakarta Pusat.
          </p>

          <p className="mb-3">
            Berikan penilaian antara skor 0 (terkecil) sd 100 (tertinggi).
          </p>

          <p className="mb-4">
            Berikan juga, saran, masukan ataupun kritik yang membangun untuk
            perbaikan ke depannya.{" "}
          </p>

          <p className="mb-2">Trmksh.</p>

          <p className="mt-4 text-sm font-medium text-gray-700 border-t pt-3">
            #Jaminan kerahasiaan respoden akan dijaga.
          </p>
        </div>
        {!canCloseModal && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Mohon tunggu 3 detik sebelum menutup pesan ini...
          </div>
        )}
      </Modal>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8"></div>

        {/* Progress */}
        <div className="max-w-6xl mx-auto mb-6 sm:mb-8 px-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs sm:text-sm text-gray-600">
              Penilaian {aspects.length} Aspek
            </span>
            <span className="text-xs sm:text-sm text-gray-600">
              Selesai: {completedCount}/{aspects.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Candidate Info */}
        <div className="max-w-6xl mx-auto mb-6 sm:mb-8">
          <div className="card px-3 py-4 sm:p-6">
            <div className="flex flex-col items-center text-center">
              {candidates.map((candidate) => (
                <div key={candidate.name} className="mb-2 w-full">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 mb-2 px-1 sm:px-2">
                    BERAKHLAK 360 - Penilaian Kepala BPS Kota Jakarta Pusat
                  </h1>
                  <hr className="border-gray-300 w-full my-3 sm:my-4" />
                  <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">
                    {capitalizeWords(candidate.name)}
                  </h3>
                </div>
              ))}
              <div className="mt-2">
                <p className="text-xs sm:text-sm text-gray-600 mb-1">
                  Skala Penilaian:
                </p>
                <p className="text-xs text-gray-500">
                  1 = Sangat Kurang, 100 = Sangat Baik
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* All Aspects List */}
        <div className="max-w-6xl mx-auto">
          <div className="space-y-6 sm:space-y-8">
            {aspects.map((aspect, aspectIndex) => {
              const aspectCompleted = candidates.every((candidate) => {
                const vote = votes[candidate.name]?.[aspect.name];
                return vote !== undefined && vote > 0;
              });

              return (
                <div key={aspect.name} className="card px-3 py-4 sm:p-6">
                  {/* Aspect Header */}
                  <div className="border-b border-gray-200 pb-3 sm:pb-4 mb-4 sm:mb-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                      <div>
                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 mb-1">
                          {aspectIndex + 1}. {aspect.name}
                        </h2>
                        {aspect.description && (
                          <p className="text-sm sm:text-base md:text-lg text-cyan-600 font-medium">
                            {aspect.description}
                          </p>
                        )}
                      </div>
                      {aspectCompleted ? (
                        <div className="flex items-center text-green-600 self-start sm:self-center mt-1 sm:mt-0">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-xs sm:text-sm font-medium">
                            Aspek Selesai
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center text-orange-500 self-start sm:self-center mt-1 sm:mt-0">
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <span className="text-xs sm:text-sm font-medium">
                            Wajib Diisi
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Voting Controls for this aspect */}
                  <div className="space-y-4">
                    {candidates.map((candidate) => {
                      const currentVote =
                        votes[candidate.name]?.[aspect.name] || 0;

                      return (
                        <div
                          key={`${candidate.name}_${aspect.name}`}
                          className="border border-gray-200 rounded-lg p-3 sm:p-4"
                        >
                          {/* Voting Controls */}
                          <div className="space-y-3">
                            {/* Slider Control */}
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:space-x-4">
                              <span className="text-sm text-gray-500 w-6 sm:w-8 text-center sm:text-left">
                                1
                              </span>
                              <input
                                type="range"
                                min="1"
                                max="100"
                                value={currentVote || 1}
                                onChange={(e) =>
                                  handleVoteChange(
                                    candidate.name,
                                    aspect.name,
                                    e.target.value
                                  )
                                }
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider w-full sm:w-auto"
                                required
                              />
                              <span className="text-sm text-gray-500 w-6 sm:w-8 text-center sm:text-right">
                                100
                              </span>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={currentVote || 1}
                                onChange={(e) =>
                                  handleVoteChange(
                                    candidate.name,
                                    aspect.name,
                                    e.target.value
                                  )
                                }
                                className="w-16 sm:w-20 px-2 py-1 border border-gray-300 rounded text-center text-sm"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formulir Terpadu: Penilaian Aspek dan Feedback */}
        <div className="max-w-6xl mx-auto mt-6 sm:mt-8">
          <div className="card px-3 py-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 text-center">
              Kesan, Kritik, dan Saran untuk Pak Undich
            </h3>
            <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 text-center">
              Silakan berikan tanggapan Anda tentang kinerja Pak Undich. Semua
              masukan Anda sangat berharga untuk perbaikan ke depan.
            </p>

            <div className="space-y-4 sm:space-y-6">
              {/* Kesan */}
              <div>
                <label
                  htmlFor="kesan"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                >
                  Kesan <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="kesan"
                  value={feedback.kesan || ""}
                  onChange={(e) =>
                    setFeedback({ ...feedback, kesan: e.target.value })
                  }
                  placeholder="Tuliskan kesan Anda tentang kinerja Pak Undich..."
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[80px] sm:min-h-[100px]"
                  required
                />
              </div>

              {/* Kritik */}
              <div>
                <label
                  htmlFor="kritik"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                >
                  Kritik <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="kritik"
                  value={feedback.kritik || ""}
                  onChange={(e) =>
                    setFeedback({ ...feedback, kritik: e.target.value })
                  }
                  placeholder="Tuliskan kritik Anda terhadap kinerja Pak Undich..."
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[80px] sm:min-h-[100px]"
                  required
                />
              </div>

              {/* Saran */}
              <div>
                <label
                  htmlFor="saran"
                  className="block text-xs sm:text-sm font-medium text-gray-700 mb-1"
                >
                  Saran <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="saran"
                  value={feedback.saran || ""}
                  onChange={(e) =>
                    setFeedback({ ...feedback, saran: e.target.value })
                  }
                  placeholder="Tuliskan saran Anda untuk perbaikan kinerja Pak Undich ke depan..."
                  className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[80px] sm:min-h-[100px]"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        {hasAnyVotes() && (
          <div className="max-w-6xl mx-auto mt-6 sm:mt-8">
            <div className="card px-3 py-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 text-center sm:text-left">
                Ringkasan Penilaian
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {candidates.map((candidate) => {
                  const candidateVotes = votes[candidate.name] || {};
                  let totalScore = 0;
                  let validAspects = 0;

                  aspects.forEach((aspect) => {
                    const vote = candidateVotes[aspect.name];
                    if (vote !== undefined && vote > 0) {
                      totalScore += vote;
                      validAspects++;
                    }
                  });

                  const avgScore =
                    validAspects > 0 ? totalScore / validAspects : 0;

                  return (
                    <div
                      key={candidate.name}
                      className="border border-gray-200 rounded-lg p-2 sm:p-3 overflow-hidden"
                    >
                      <h4 className="font-medium text-gray-800 mb-1 sm:mb-2 text-center">
                        {capitalizeWords(candidate.name)}
                      </h4>
                      <div>
                        <p className="text-xs sm:text-sm text-gray-600 text-center">
                          Rata-rata: {avgScore.toFixed(1)}
                        </p>
                        <div className="text-xs text-gray-500 mt-1 overflow-x-auto max-h-[150px] sm:max-h-none">
                          {aspects.map((aspect) => {
                            return (
                              <div
                                key={aspect.name}
                                className="flex justify-between"
                              >
                                <span className="truncate mr-2">
                                  {aspect.name}:
                                </span>
                                <span className="flex-shrink-0">
                                  {candidateVotes[aspect.name] !== undefined &&
                                  candidateVotes[aspect.name] > 0
                                    ? candidateVotes[aspect.name]
                                    : "-"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tombol Submit Terpadu */}
        <div className="max-w-6xl mx-auto mt-6 sm:mt-8 mb-8 sm:mb-12">
          <div className="card bg-gray-50 border border-gray-200 px-3 py-4 sm:p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
              <div className="w-full md:w-auto text-center md:text-left">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-1">
                  Kirim Penilaian dan Tanggapan
                </h3>

                <p className="text-xs text-gray-700">
                  <strong>Informasi Privasi</strong>
                </p>
                <ul className="list-disc pl-3 mt-1 text-xs text-gray-600 space-y-0.5">
                  <li>Email untuk verifikasi responden</li>
                  <li>
                    Data disimpan secara <strong>anonim</strong>
                  </li>
                  <li>Kerahasiaan data terjamin</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full md:w-auto pb-20 sm:pb-0">
                <div className="relative w-full sm:w-64 mb-2 sm:mb-0">
                  <input
                    type="email"
                    id="bps-email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="nama@bps.go.id"
                    className={`w-full px-3 sm:px-4 py-2 border ${
                      emailError ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm`}
                    required
                  />
                  {emailError && (
                    <p className="text-red-500 text-xs absolute">
                      {emailError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-center w-full sm:w-auto">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 sm:px-8 py-4 sm:py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-colors font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg fixed sm:static bottom-4 left-0 right-0 mx-auto max-w-[90%] sm:bottom-auto sm:left-auto sm:right-auto z-20 border-2 border-white flex items-center justify-center"
                >
                  <span className="mr-2">
                    {isSubmitting ? "Mengirim..." : "Kirim"}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
