
import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale,
    PointElement,
    LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Users, BookOpen, GraduationCap, Filter, ChevronDown, Calendar } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale,
    PointElement,
    LineElement
);

const StudentDashboard = () => {
    // State for storing API data
    const [students, setStudents] = useState({});
    const [castes, setCastes] = useState({});
    const [departments, setDepartments] = useState({});
    const [streams, setStreams] = useState({});
const [detailedCombinationData, setDetailedCombinationData] = useState([]);

    // Derived data states
    const [departmentData, setDepartmentData] = useState([]);
    const [admissionTypeData, setAdmissionTypeData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);
    const [streamData, setStreamData] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [admissionsByMonth, setAdmissionsByMonth] = useState([]);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for the primary filter type
    const [filterType, setFilterType] = useState('Department');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // State for the month filter
    const [selectedMonthFilter, setSelectedMonthFilter] = useState(null);
    const [isMonthFilterOpen, setIsMonthFilterOpen] = useState(false);


useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch all data in parallel
            const [
                studentsResponse,
                castesResponse,
                departmentsResponse,
                streamsResponse
            ] = await Promise.all([
                fetch('http://localhost:5000/api/students'),
                fetch('http://localhost:5000/api/superadmin/castes'),
                fetch('http://localhost:5000/api/superadmin/departments'),
                fetch('http://localhost:5000/api/streams')
            ]);

            // Check if responses are successful
            if (!studentsResponse.ok) throw new Error("Failed to fetch students data");
            if (!castesResponse.ok) throw new Error("Failed to fetch castes data");
            if (!departmentsResponse.ok) throw new Error("Failed to fetch departments data");
            if (!streamsResponse.ok) throw new Error("Failed to fetch streams data");

            // Parse JSON responses
            const studentsData = await studentsResponse.json();
            const castesData = await castesResponse.json();
            const departmentsData = await departmentsResponse.json();
            const streamsData = await streamsResponse.json();

            // Store raw data
            setStudents(studentsData);
            setCastes(castesData);
            setDepartments(departmentsData);
            setStreams(streamsData);
            // Process data
            processData(studentsData, castesData, departmentsData, streamsData);
        } catch (error) {
            console.error("Data fetching error:", error);
            setError("An error occurred while fetching data.");
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchData();
}, []); // You may need to add dependencies like processData here if it's from props or context
console.log(students, castes, departments, streams);

    // Process the data to create the required data structures
    const processData = (studentsData, castesData, departmentsData, streamsData) => {
        // Set total number of students
        setTotalStudents(studentsData.length);

        // Process department data
        const deptCounts = {};
        departmentsData.forEach(dept => {
            deptCounts[dept.id] = 0;
        });

    

        // Process admission types
        const admTypes = {
            'Normal': 0,
            'Direct Second Year': 0,
            'Lateral Entry': 0
        };

        // Process categories (castes)
        const catCounts = {};
        castesData.forEach(caste => {
            catCounts[caste.id] = 0;
        });

        // Process streams
        const streamCounts = {};
        streamsData.forEach(stream => {
            streamCounts[stream.id] = 0;
        });

        // Process monthly data
        const monthlyData = {};
        // Count students for each category
        studentsData.forEach(student => {
            // Department counts
            if (student.departmentId && Object.prototype.hasOwnProperty.call(deptCounts, student.departmentId)) {
                deptCounts[student.departmentId]++;
            }

            // Admission type counts
            console.log(student.admissionType)
            if (student.admissionType) {
                if (Object.prototype.hasOwnProperty.call(admTypes, student.admissionType)) {
                    admTypes[student.admissionType]++;
                } else {
                    // Default to 'Normal' if not specified
                    admTypes['Normal']++;
                }
            } else {
                admTypes['Normal']++;
            }

            // Category counts
            if (student.casteId && Object.prototype.hasOwnProperty.call(catCounts, student.casteId)) {
                catCounts[student.casteId]++;
            }

            // Stream counts
            if (student.streamId && Object.prototype.hasOwnProperty.call(streamCounts, student.streamId)) {
                streamCounts[student.streamId]++;
            }

            // Process monthly data (assuming student.admissionDate exists)
            if (student.admissionDate) {
                const date = new Date(student.admissionDate);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = {
                        month: monthYear,
                        departments: {},
                        admissionTypes: { 'Normal': 0, 'Direct 2nd Year': 0, 'Lateral Entry': 0 },
                        categories: {},
                        streams: {}
                    };

                    console.log(departmentData)
                    // Initialize with zeros
                    departmentsData.forEach(dept => {
                        monthlyData[monthYear].departments[dept.id] = 0;
                    });

                    castesData.forEach(caste => {
                        monthlyData[monthYear].categories[caste.id] = 0;
                    });

                    streamsData.forEach(stream => {
                        monthlyData[monthYear].streams[stream.id] = 0;
                    });
                }

                // Increment monthly counters
                if (student.departmentId) {
                    monthlyData[monthYear].departments[student.departmentId]++;
                }

                if (student.admissionType) {
                    if (Object.prototype.hasOwnProperty.call(monthlyData[monthYear].admissionTypes, student.admissionType)) {
                        monthlyData[monthYear].admissionTypes[student.admissionType]++;
                    } else {
                        monthlyData[monthYear].admissionTypes['Normal']++;
                    }
                } else {
                    monthlyData[monthYear].admissionTypes['Normal']++;
                }

                if (student.casteId) {
                    monthlyData[monthYear].categories[student.casteId]++;
                }

                if (student.streamId) {
                    monthlyData[monthYear].streams[student.streamId]++;
                }
            }
        });

        // Format department data for charts
        const formattedDepartments = departmentsData.map(dept => ({
            name: dept.name,
            count: deptCounts[dept.id] || 0
        })).sort((a, b) => b.count - a.count);

        // Format admission type data
        const formattedAdmissionTypes = Object.keys(admTypes).map(type => ({
            name: type,
            count: admTypes[type]
        })).sort((a, b) => b.count - a.count);

        // Format category data
        const formattedCategories = castesData.map(caste => ({
            name: caste.name,
            count: catCounts[caste.id] || 0
        })).sort((a, b) => b.count - a.count);

        // Format stream data
        const formattedStreams = streamsData.map(stream => ({
            name: stream.name,
            count: streamCounts[stream.id] || 0
        })).sort((a, b) => b.count - a.count);

        // Format monthly data
        const formattedMonthlyData = Object.keys(monthlyData).map(month => {
            const data = monthlyData[month];

            return {
                month: data.month,
                departments: departmentsData.map(dept => ({
                    name: dept.name,
                    count: data.departments[dept.id] || 0
                })).sort((a, b) => b.count - a.count),
                admissionTypes: Object.keys(data.admissionTypes).map(type => ({
                    name: type,
                    count: data.admissionTypes[type]
                })).sort((a, b) => b.count - a.count),
                categories: castesData.map(caste => ({
                    name: caste.name,
                    count: data.categories[caste.id] || 0
                })).sort((a, b) => b.count - a.count),
                streams: streamsData.map(stream => ({
                    name: stream.name,
                    count: data.streams[stream.id] || 0
                })).sort((a, b) => b.count - a.count)
            };
        }).sort((a, b) => a.month.localeCompare(b.month));

        // Set state with processed data
        setDepartmentData(formattedDepartments);
        setAdmissionTypeData(formattedAdmissionTypes);
        setCategoryData(formattedCategories);
        setStreamData(formattedStreams);
        setAdmissionsByMonth(formattedMonthlyData);
    };

console.log(detailedCombinationData)
    // Determine bar chart data based on the primary filter and the month filter
    const getBarChartData = () => {
        let data, labels, title;

        if (selectedMonthFilter) {
            const monthData = admissionsByMonth.find((item) => item.month === selectedMonthFilter);
            if (monthData) {
                switch (filterType) {
                    case 'Department':
                        data = monthData.departments.map((dept) => dept.count);
                        labels = monthData.departments.map((dept) => dept.name);
                        title = `Student Enrollment by Department (${formatMonthYear(selectedMonthFilter)})`;
                        break;
                    case 'Admission Type':
                        data = monthData.admissionTypes.map((type) => type.count);
                        labels = monthData.admissionTypes.map((type) => type.name);
                        title = `Student Enrollment by Admission Type (${formatMonthYear(selectedMonthFilter)})`;
                        break;
                    case 'Category':
                        data = monthData.categories.map((cat) => cat.count);
                        labels = monthData.categories.map((cat) => cat.name);
                        title = `Student Enrollment by Category (${formatMonthYear(selectedMonthFilter)})`;
                        break;
                    case 'Stream':
                        data = monthData.streams.map((stream) => stream.count);
                        labels = monthData.streams.map((stream) => stream.name);
                        title = `Student Enrollment by Stream (${formatMonthYear(selectedMonthFilter)})`;
                        break;
                    default:
                        data = [];
                        labels = [];
                        title = '';
                }
            } else {
                data = [];
                labels = [];
                title = `No Data for ${formatMonthYear(selectedMonthFilter)}`;
            }
        } else {
            switch (filterType) {
                case 'Department':
                    data = departmentData.map((dept) => dept.count);
                    labels = departmentData.map((dept) => dept.name);
                    title = 'Student Enrollment by Department';
                    break;
                case 'Admission Type':
                    data = admissionTypeData.map((type) => type.count);
                    labels = admissionTypeData.map((type) => type.name);
                    title = 'Student Enrollment by Admission Type';
                    break;
                case 'Category':
                    data = categoryData.map((cat) => cat.count);
                    labels = categoryData.map((cat) => cat.name);
                    title = 'Student Enrollment by Category';
                    break;
                case 'Stream':
                    data = streamData.map((stream) => stream.count);
                    labels = streamData.map((stream) => stream.name);
                    title = 'Student Enrollment by Stream';
                    break;
                default:
                    data = [];
                    labels = [];
                    title = '';
            }
        }

        return {
            labels,
            datasets: [
                {
                    label: selectedMonthFilter ? 'Admissions' : 'Students Enrolled',
                    data,
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(79, 70, 229, 0.8)',
                        'rgba(67, 56, 202, 0.8)',
                        'rgba(55, 48, 163, 0.8)',
                        'rgba(49, 46, 129, 0.8)',
                    ],
                    borderColor: [
                        'rgba(99, 102, 241, 1)',
                        'rgba(79, 70, 229, 1)',
                        'rgba(67, 56, 202, 1)',
                        'rgba(55, 48, 163, 1)',
                        'rgba(49, 46, 129, 1)',
                    ],
                    borderWidth: 1,
                    borderRadius: 6,
                },
            ],
            title,
        };
    };

    // Determine doughnut chart data based on the primary filter and the month filter
    const getDoughnutData = () => {
        let data, labels;

        if (selectedMonthFilter) {
            const monthData = admissionsByMonth.find((item) => item.month === selectedMonthFilter);
            if (monthData) {
                switch (filterType) {
                    case 'Department':
                        data = monthData.departments.map((dept) => dept.count);
                        labels = monthData.departments.map((dept) => dept.name);
                        break;
                    case 'Admission Type':
                        data = monthData.admissionTypes.map((type) => type.count);
                        labels = monthData.admissionTypes.map((type) => type.name);
                        break;
                    case 'Category':
                        data = monthData.categories.map((cat) => cat.count);
                        labels = monthData.categories.map((cat) => cat.name);
                        break;
                    case 'Stream':
                        data = monthData.streams.map((stream) => stream.count);
                        labels = monthData.streams.map((stream) => stream.name);
                        break;
                    default:
                        data = [];
                        labels = [];
                }
            } else {
                data = [];
                labels = [];
            }
        } else {
            switch (filterType) {
                case 'Department':
                    data = departmentData.map((dept) => dept.count);
                    labels = departmentData.map((dept) => dept.name);
                    break;
                case 'Admission Type':
                    data = admissionTypeData.map((type) => type.count);
                    labels = admissionTypeData.map((type) => type.name);
                    break;
                case 'Category':
                    data = categoryData.map((cat) => cat.count);
                    labels = categoryData.map((cat) => cat.name);
                    break;
                case 'Stream':
                    data = streamData.map((stream) => stream.count);
                    labels = streamData.map((stream) => stream.name);
                    break;
                default:
                    data = [];
                    labels = [];
            }
        }

        return {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(16, 185, 129, 0.8)',
                        'rgba(245, 158, 11, 0.8)',
                        'rgba(239, 68, 68, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                    ],
                    borderColor: [
                        'rgba(59, 130, 246, 1)',
                        'rgba(16, 185, 129, 1)',
                        'rgba(245, 158, 11, 1)',
                        'rgba(239, 68, 68, 1)',
                        'rgba(139, 92, 246, 1)',
                    ],
                    borderWidth: 1,
                },
            ],
        };
    };

    // Helper function to format month-year
    const formatMonthYear = (monthYearStr) => {
        if (!monthYearStr) return '';
        try {
            const [year, month] = monthYearStr.split('-');
            return new Date(`${year}-${month}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });
        } catch (error) {
            return monthYearStr;
        }
    };

    // Chart options
    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: getBarChartData().title,
                font: { size: 16, weight: 'bold' },
                color: '#1e293b',
                padding: { top: 10, bottom: 20 },
            },
            tooltip: {
                enabled: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 12 },
                },
            },
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#64748b',
                    font: { size: 12, weight: 'bold' },
                    callback: function (index) {
                        const label = this.getLabelForValue(index);
                        const value = this.chart.data.datasets[0].data[index];
                        return [`${label}`, `(${value})`];
                    },
                    padding: 10,
                },
            },
        },
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: { size: 12 },
                    usePointStyle: true,
                    padding: 20,
                    color: '#64748b',
                },
            },
            title: {
                display: true,
                text: selectedMonthFilter
                    ? `Students by ${filterType} (${formatMonthYear(selectedMonthFilter)})`
                    : `Students by ${filterType}`,
                font: { size: 16, weight: 'bold' },
                color: '#1e293b',
                padding: { top: 10, bottom: 10 },
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.9)',
                padding: 12,
                titleFont: { size: 14 },
                bodyFont: { size: 13 },
                callbacks: {
                    label: function (context) {
                        const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                        const percentage = Math.round((context.raw / total) * 100);
                        return `${context.label}: ${context.raw} (${percentage}%)`;
                    },
                },
            },
        },
    };

    // Stats items
    const statItems = [
        {
            title: 'Total Students',
            value: totalStudents,
            icon: <Users className="h-6 w-6 text-indigo-600" />
        },
        {
            title: 'Departments',
            value: departments.length,
            icon: <BookOpen className="h-6 w-6 text-indigo-600" />
        },
        {
            title: 'Streams',
            value: streams.length,
            icon: <GraduationCap className="h-6 w-6 text-indigo-600" />
        },
    ];

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-lg text-gray-700">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-md p-8 max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h2>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 pb-12">
            {/* Header */}
            <div className="bg-indigo-600 text-white py-6 px-6 md:px-10 shadow-lg">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl md:text-3xl font-bold">Student Enrollment Dashboard</h1>
                    <p className="text-indigo-100 mt-1">Academic Year 2024-2025</p>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {statItems.map((stat, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-md p-6 flex items-center transform transition-all hover:shadow-lg">
                            <div className="bg-indigo-50 p-3 rounded-lg mr-4">{stat.icon}</div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                                <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart Section */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                            {/* Primary Filter dropdown */}
                            <div className="relative inline-block">
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className="flex items-center justify-between w-48 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <div className="flex items-center">
                                        <Filter className="w-4 h-4 mr-2" />
                                        <span>{filterType}</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </button>

                                {isFilterOpen && (
                                    <div className="absolute z-10 w-48 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                        <div className="py-1">
                                            {['Department', 'Admission Type', 'Category', 'Stream'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => {
                                                        setFilterType(type);
                                                        setIsFilterOpen(false);
                                                        setSelectedMonthFilter(null); // Reset month filter when primary filter changes
                                                    }}
                                                    className={`block w-full px-4 py-2 text-sm text-left ${filterType === type ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Month Filter dropdown */}
                            <div className="relative inline-block">
                                <button
                                    onClick={() => setIsMonthFilterOpen(!isMonthFilterOpen)}
                                    className="flex items-center justify-between w-48 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        <span>{selectedMonthFilter ? formatMonthYear(selectedMonthFilter) : 'Select Month'}</span>
                                    </div>
                                    <ChevronDown className="w-4 h-4" />
                                </button>

                                {isMonthFilterOpen && admissionsByMonth.length > 0 && (
                                    <div className="absolute z-10 w-48 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                        <div className="py-1">
                                            {admissionsByMonth.map((item) => (
                                                <button
                                                    key={item.month}
                                                    onClick={() => {
                                                        setSelectedMonthFilter(item.month);
                                                        setIsMonthFilterOpen(false);
                                                    }}
                                                    className={`block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 ${selectedMonthFilter === item.month ? 'bg-indigo-50 text-indigo-700' : ''
                                                        }`}
                                                >
                                                    {formatMonthYear(item.month)}
                                                </button>
                                            ))}
                                            {selectedMonthFilter && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedMonthFilter(null);
                                                        setIsMonthFilterOpen(false);
                                                    }}
                                                    className="block w-full px-4 py-2 text-sm text-left text-red-700 hover:bg-red-50"
                                                >
                                                    Clear Month
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {isMonthFilterOpen && admissionsByMonth.length === 0 && (
                                    <div className="absolute z-10 w-48 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
                                        <div className="py-1">
                                            <p className="block w-full px-4 py-2 text-sm text-gray-500">No monthly data available</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bar Chart */}
                        <div className="h-80">
                            <Bar data={getBarChartData()} options={barChartOptions} />
                        </div>
                    </div>

                    {/* Doughnut Chart */}
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <div className="h-64">
                            <Doughnut data={getDoughnutData()} options={doughnutOptions} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;