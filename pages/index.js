import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Home() {
  const [isInitializing, setIsInitializing] = useState(true);
  const router = useRouter();

  // Initialize database on component mount
  useEffect(() => {
    const initializeDB = async () => {
      try {
        const response = await fetch("/api/init-db", {
          method: "POST",
        });

        if (!response.ok) {
          console.warn("Database initialization failed, but continuing...");
        }
      } catch (error) {
        console.warn("Database initialization error:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeDB();
  }, []);



  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100">
      <Head>
        <title>BERAKHLAK 360 | Sistem Penilaian Performa Kepala BPS Jakarta Pusat</title>
        <meta name="description" content="Sistem penilaian komprehensif 360 derajat untuk mengevaluasi performa kepemimpinan Kepala BPS Jakarta Pusat" />
      </Head>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <img src="/bps.png" className="w-12 h-12 mx-auto mb-4"></img>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            BERAKHLAK 360
          </h1>
          <h2 className="text-2xl md:text-3xl font-semibold text-cyan-600 mb-2">
            Performa 360 Kepala Jakarta Pusat
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Sistem penilaian komprehensif 360 derajat untuk mengevaluasi performa kepemimpinan 
            Kepala BPS Jakarta Pusat berdasarkan 11 aspek BERAKHLAK PNS: Berorientasi Pelayanan, 
            Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif, Komitmen, Inisiatif Kerja, 
            Kerjasama, dan Kepemimpinan.
          </p>
          {isInitializing && (
            <div className="mt-4 text-sm text-cyan-600">
              <div className="animate-pulse">Menginisialisasi database...</div>
            </div>
          )}
        </div>

        <div className="max-w-md mx-auto">
          <div className="card text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-cyan-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Siap untuk memberikan penilaian?
              </h3>
              <p className="text-gray-600 mb-6">
                Klik tombol di bawah untuk memulai proses penilaian performa
              </p>
            </div>
            <button
              onClick={() => router.push("/voting")}
              className="btn-primary w-full text-lg py-3 mb-3"
            >
              Mulai Penilaian
            </button>
            <button
              onClick={() => router.push("/admin")}
              className="btn-secondary w-full text-lg py-3"
            >
              Admin Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
