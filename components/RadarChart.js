import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

// Register required Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const RadarChart = ({ aspectData }) => {
  console.log("RadarChart received aspectData:", aspectData);
  
  // Ensure aspectData is an array and contains valid data
  if (!aspectData || !Array.isArray(aspectData) || aspectData.length === 0) {
    console.error("Invalid or empty aspectData provided to RadarChart");
    return <div className="w-full h-[400px] p-4 flex items-center justify-center text-gray-500">Data tidak tersedia</div>;
  }
  
  // Validate that each item has the required properties
  const isValidData = aspectData.every(item => 
    item && 
    typeof item === 'object' && 
    'name' in item && 
    'averageScore' in item && 
    !isNaN(item.averageScore)
  );
  
  if (!isValidData) {
    console.error("Invalid data format in aspectData", aspectData);
    return <div className="w-full h-[400px] p-4 flex items-center justify-center text-gray-500">Format data tidak valid</div>;
  }
  
  // Prepare data for the radar chart
  const data = {
    labels: aspectData.map(item => item.name),
    datasets: [
      {
        label: 'Nilai Rata-rata',
        data: aspectData.map(item => item.averageScore),
        backgroundColor: 'rgba(0, 150, 199, 0.2)',
        borderColor: 'rgba(0, 150, 199, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(0, 150, 199, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(0, 150, 199, 1)'
      }
    ]
  };
  
  console.log("Radar chart data prepared:", data);

  // Chart options
  const options = {
    scales: {
      r: {
        angleLines: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: {
          stepSize: 20,
          backdropColor: 'rgba(255, 255, 255, 0.8)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#333'
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 14
          },
          color: '#333'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: {
          size: 14
        },
        bodyFont: {
          size: 13
        },
        padding: 10,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.formattedValue}`;
          }
        }
      }
    },
    responsive: true,
    maintainAspectRatio: false
  };

  return (
    <div className="w-full h-[400px] p-4">
      <Radar data={data} options={options} />
    </div>
  );
};

export default RadarChart;