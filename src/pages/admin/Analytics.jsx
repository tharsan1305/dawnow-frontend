import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Activity, Book, Award, Users, FileText,
    ArrowUpRight, Download, Calendar, Filter, Search, ChevronRight, X, FileBadge
} from 'lucide-react';
import { adminAPI } from '../../api';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const Analytics = () => {
    const [activeTab, setActiveTab] = useState('Overview'); // Overview, Staff Performance, Department Report
    const [loading, setLoading] = useState(true);
    
    // Overview Data
    const [overview, setOverview] = useState({
        sciPapersAccepted: 0, sciPapersPublished: 0, scopusPapersAccepted: 0, scopusPapersPublished: 0,
        patentPublished: 0, patentGrant: 0, conferencePapersAccepted: 0, conferencePapersPublished: 0,
        bookChaptersAccepted: 0, bookChaptersPublished: 0, fundingApplied: 0, fundingReceived: 0,
        totalPapers: 0, totalSCI: 0, totalPatents: 0, totalFunded: 0
    });
    const [trendData, setTrendData] = useState([]);
    const [topPerformers, setTopPerformers] = useState([]);

    // Staff Performance Data
    const [staffStats, setStaffStats] = useState({ summary: {}, staffList: [] });
    const [filters, setFilters] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        dept: 'All',
        rating: 'All',
        search: ''
    });

    // Department Report Data
    const [deptReport, setDeptReport] = useState([]);

    // Charts Data
    const [chartsData, setChartsData] = useState({
        top10Staff: [], activityCounts: [], deptComparison: [], monthlyTrend: []
    });

    // Modal State
    const [selectedStaff, setSelectedStaff] = useState(null);

    const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
    const CHART_COLORS = ['#1e3a5f', '#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6'];

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = [2024, 2025, 2026];
    const departments = ['All', 'CSE', 'EEE', 'ECE', 'MECH', 'CIVIL', 'IT', 'MCA'];
    const ratings = ['All', 'Excellent', 'Good', 'Average', 'Poor'];

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (activeTab === 'Staff Performance') fetchStaffPerformance();
        if (activeTab === 'Department Report') fetchDepartmentReport();
    }, [activeTab]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [ovData, trendRes, topData] = await Promise.all([
                adminAPI.getAnalytics('overview'),
                adminAPI.getAnalytics('weekly-trend'),
                adminAPI.getAnalytics('top-staff')
            ]);
            setOverview(ovData || overview);
            setTrendData(trendRes || []);
            setTopPerformers(topData || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaffPerformance = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/analytics/staff-performance?month=${filters.month}&year=${filters.year}&dept=${filters.dept}`);
            setStaffStats(res.data);
            
            // Fetch Charts too
            const charsRes = await API.get(`/analytics/charts?month=${filters.month}&year=${filters.year}`);
            setChartsData(charsRes.data);
        } catch (err) {
            toast.error("Failed to load staff performance");
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartmentReport = async () => {
        setLoading(true);
        try {
            const res = await API.get(`/analytics/department-performance?month=${filters.month}&year=${filters.year}`);
            setDeptReport(res.data);
        } catch (err) {
            toast.error("Failed to load department report");
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        if (activeTab === 'Staff Performance') fetchStaffPerformance();
        if (activeTab === 'Department Report') fetchDepartmentReport();
    };

    const getRatingBadge = (rating) => {
        const styles = {
            Excellent: 'bg-yellow-400 text-yellow-900 border-yellow-500',
            Good: 'bg-green-500 text-white border-green-600',
            Average: 'bg-blue-400 text-white border-blue-500',
            Poor: 'bg-red-500 text-white border-red-600'
        };
        return <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${styles[rating] || 'bg-slate-200'}`}>{rating}</span>;
    };

    // ============ PDF GENERATION (PROFESSIONAL VERSION) ============
    const handleDownloadPDF = async () => {
        try {
            const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' });
            const selectedMonth = months[filters.month - 1];
            const selectedYear = filters.year;

            // Data Mapping
            const staffPerformanceData = staffStats.staffList;
            const departmentData = deptReport.map(d => ({
                 name: d.department,
                 totalStaff: d.totalStaff,
                 activeStaff: d.activeStaff,
                 papers: d.papers,
                 patents: d.patents,
                 projects: d.projects,
                 books: d.books,
                 completionRate: d.completionPercent,
                 avgRating: d.avgRating
            }));
            const summaryData = {
                totalStaff: staffStats.summary.totalStaff || 0,
                totalPapers: staffStats.summary.totalPapers || 0,
                totalPatents: staffStats.summary.totalPatents || 0,
                totalProjects: staffStats.summary.totalProjects || 0,
                totalBooks: staffStats.summary.totalBooks || 0,
                topPerformer: staffStats.summary.topPerformer || 'N/A'
            };

            // Get logo
            const logoEl = document.getElementById('analytics-logo');
            let logoBase64 = null;
            if (logoEl) {
                try {
                   const canvas = document.createElement('canvas');
                   canvas.width = logoEl.naturalWidth;
                   canvas.height = logoEl.naturalHeight;
                   const ctx = canvas.getContext('2d');
                   ctx.drawImage(logoEl, 0, 0);
                   logoBase64 = canvas.toDataURL('image/png');
                } catch(e) { console.warn('Logo error:', e); }
            }

            // PAGE 1 — Cover Page
            if (logoBase64) doc.addImage(logoBase64, 'PNG', 100, 8, 90, 28);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('CENTER FOR RESEARCH AND DEVELOPMENT', 148, 45, { align: 'center' });
            doc.setFontSize(11);
            doc.text('JJ COLLEGE OF ENGINEERING AND TECHNOLOGY', 148, 53, { align: 'center' });
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('AUTONOMOUS — SOWDAMBIKAA GROUP OF INSTITUTIONS', 148, 60, { align: 'center' });
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('STAFF RESEARCH PERFORMANCE REPORT', 148, 80, { align: 'center' });
            doc.setFontSize(13);
            doc.text(`${selectedMonth} ${selectedYear}`, 148, 92, { align: 'center' });
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 148, 102, { align: 'center' });

            // Summary box on cover
            doc.setDrawColor(30, 58, 95);
            doc.setLineWidth(0.5);
            doc.rect(40, 112, 215, 40);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('EXECUTIVE SUMMARY', 148, 120, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.text(`Total Staff: ${summaryData.totalStaff}`, 55, 128);
            doc.text(`Total Papers: ${summaryData.totalPapers}`, 55, 135);
            doc.text(`Total Patents: ${summaryData.totalPatents}`, 55, 142);
            doc.text(`Total Projects: ${summaryData.totalProjects}`, 148, 128);
            doc.text(`Total Books: ${summaryData.totalBooks}`, 148, 135);
            doc.text(`Top Performer: ${summaryData.topPerformer}`, 148, 142);
            doc.addPage();

            // PAGE 2 — Main Staff Performance Table
            if (logoBase64) doc.addImage(logoBase64, 'PNG', 100, 2, 90, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Staff Research Performance — Detailed Report', 148, 28, { align: 'center' });

            const tableRows = staffPerformanceData.map((s, i) => [
                i + 1, s.name, s.department, s.designation,
                s.sciPapers || 0, s.scopusPapers || 0, s.conferencePapers || 0,
                s.patentsFiled || 0, s.patentsGranted || 0,
                s.projectsApplied || 0, s.fundedAmount || 'NIL',
                s.bookChapters || 0, `${s.submissionDays || 0}/26`,
                s.totalActivities || 0, s.rating || 'Poor'
            ]);

            autoTable(doc, {
                head: [[
                    'S.No', 'Name', 'Dept', 'Designation',
                    'SCI\nPapers', 'Scopus\nPapers', 'Conf.\nPapers',
                    'Patents\nFiled', 'Patents\nGranted',
                    'Projects\nApplied', 'Funded\n(Rs.)',
                    'Books', 'Sub.\nDays', 'Total', 'Rating'
                ]],
                body: tableRows,
                startY: 32,
                styles: {
                    fontSize: 6.5, cellPadding: 1.8, valign: 'middle',
                    lineColor: [0, 0, 0], lineWidth: 0.2, font: 'helvetica'
                },
                headStyles: {
                    fillColor: [30, 58, 95], textColor: [255, 255, 255],
                    fontStyle: 'bold', fontSize: 7, halign: 'center',
                    cellPadding: 2, minCellHeight: 10
                },
                columnStyles: {
                    0:  { cellWidth: 7,  halign: 'center' },
                    1:  { cellWidth: 24, fontStyle: 'bold' },
                    2:  { cellWidth: 13, halign: 'center' },
                    3:  { cellWidth: 22 },
                    4:  { cellWidth: 13, halign: 'center' },
                    5:  { cellWidth: 13, halign: 'center' },
                    6:  { cellWidth: 13, halign: 'center' },
                    7:  { cellWidth: 13, halign: 'center' },
                    8:  { cellWidth: 13, halign: 'center' },
                    9:  { cellWidth: 13, halign: 'center' },
                    10: { cellWidth: 16, halign: 'center' },
                    11: { cellWidth: 11, halign: 'center' },
                    12: { cellWidth: 12, halign: 'center' },
                    13: { cellWidth: 11, halign: 'center' },
                    14: { cellWidth: 18, halign: 'center' },
                },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    const row = data.row.index;
                    data.cell.styles.fillColor = row % 2 === 0 ? [219,234,254] : [220,252,231];
                    if (data.column.index === 14) {
                        const val = data.cell.raw;
                        if (val === 'Excellent') { data.cell.styles.fillColor=[254,240,138]; data.cell.styles.textColor=[133,77,14]; data.cell.styles.fontStyle='bold'; }
                        else if (val === 'Good') { data.cell.styles.fillColor=[187,247,208]; data.cell.styles.textColor=[21,128,61]; data.cell.styles.fontStyle='bold'; }
                        else if (val === 'Average') { data.cell.styles.fillColor=[191,219,254]; data.cell.styles.textColor=[30,58,138]; data.cell.styles.fontStyle='bold'; }
                        else if (val === 'Poor') { data.cell.styles.fillColor=[254,226,226]; data.cell.styles.textColor=[220,38,38]; data.cell.styles.fontStyle='bold'; }
                    }
                },
                showHead: 'everyPage',
                rowPageBreak: 'auto',
                margin: { top: 8, left: 4, right: 4, bottom: 12 },
                didDrawPage: (data) => {
                    if (logoBase64 && data.pageNumber > 1) {
                        doc.addImage(logoBase64, 'PNG', 100, 2, 90, 8);
                    }
                    doc.setFontSize(7);
                    doc.setTextColor(120);
                    doc.text(`Page ${data.pageNumber} | CFRD — JJ College of Engineering & Technology`, 148, doc.internal.pageSize.height - 4, { align: 'center' });
                    doc.setTextColor(0);
                }
            });

            // PAGE — Department Summary Table
            doc.addPage();
            if (logoBase64) doc.addImage(logoBase64, 'PNG', 100, 2, 90, 22);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Department-wise Research Summary', 148, 28, { align: 'center' });

            const deptRows = departmentData.map((d, i) => [
                i + 1, d.name, d.totalStaff, d.activeStaff,
                d.papers, d.patents, d.projects, d.books,
                d.completionRate + '%', d.avgRating
            ]);

            autoTable(doc, {
                head: [['S.No', 'Department', 'Total Staff', 'Active Staff', 'Papers', 'Patents', 'Projects', 'Books', 'Completion %', 'Avg Rating']],
                body: deptRows,
                startY: 32,
                styles: { fontSize: 8, cellPadding: 2.5, valign: 'middle', lineColor: [0,0,0], lineWidth: 0.2 },
                headStyles: { fillColor: [30,58,95], textColor: 255, fontStyle: 'bold', fontSize: 9, halign: 'center' },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    if (data.column.index === 8) {
                        const val = parseInt(data.cell.raw);
                        if (val >= 75) data.cell.styles.fillColor = [187,247,208];
                        else if (val >= 50) data.cell.styles.fillColor = [254,249,195];
                        else data.cell.styles.fillColor = [254,226,226];
                    } else {
                        data.cell.styles.fillColor = data.row.index % 2 === 0 ? [219,234,254] : [220,252,231];
                    }
                },
                showHead: 'everyPage',
                margin: { top: 8, left: 10, right: 10, bottom: 12 },
            });

            // LAST PAGE — Signatures
            const finalY = doc.lastAutoTable.finalY + 20;
            const pageH = doc.internal.pageSize.height;
            const signY = finalY < pageH - 35 ? finalY : pageH - 35;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('________________________', 20, signY);
            doc.text('Dean', 20, signY + 6);
            doc.text('Research and Development', 20, signY + 11);
            doc.text('JJ College of Engineering & Technology', 20, signY + 16);
            doc.text('________________________', 220, signY);
            doc.text('Principal', 220, signY + 6);
            doc.text('JJ College of Engineering & Technology', 220, signY + 11);

            doc.save(`CFRD_Staff_Performance_${selectedMonth}_${selectedYear}.pdf`);

        } catch (err) {
            console.error('PDF generation error:', err);
            toast.error('PDF generation failed: ' + err.message);
        }
    };

        // Signatures
        const finalY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(10);
        doc.text('________________________', 20, finalY);
        doc.text('Dean, R&D', 25, finalY + 6);
        
        doc.text('________________________', pageWidth - 70, finalY);
        doc.text('Principal', pageWidth - 60, finalY + 6);

        doc.save(`CFRD_Staff_Performance_${monthName}_${year}.pdf`);
    };

    const handleDownloadExcel = () => {
        const monthName = months[filters.month - 1];
        const wb = XLSX.utils.book_new();

        // Sheet 1: Summary Performance
        const summaryData = staffStats.staffList.map((s, i) => ({
            'S.No': i + 1,
            'Name': s.name,
            'Dept': s.department,
            'Designation': s.designation,
            'SCI Papers': s.sciPapers,
            'Scopus Papers': s.scopusPapers,
            'Conference': s.conferencePapers,
            'Patents Filed': s.patentsFiled,
            'Patents Granted': s.patentsGranted,
            'Projects Applied': s.projectsApplied,
            'Funded (Rs.)': s.fundedAmount,
            'Book Chapters': s.bookChapters,
            'Submission Days': s.submissionDays,
            'Total': s.totalActivities,
            'Rating': s.rating
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'Staff Performance');

        // Sheet 2: Department Summary
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(deptReport), 'Department Summary');

        XLSX.writeFile(wb, `CFRD_Research_Report_${monthName}_${filters.year}.xlsx`);
    };

    // ============ Tab Renderers ============

    const renderOverview = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl border border-slate-800 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-green/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <h2 className="text-xl font-bold mb-8 flex items-center border-b border-slate-800 pb-4">
                    <Activity className="w-5 h-5 mr-2 text-primary-green" />
                    Lifetime Research Matrix
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-y-10 gap-x-8 relative z-10">
                    <div className="space-y-2">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">SCI Papers</p>
                        <div className="flex items-baseline space-x-1">
                            <span className="text-3xl font-black text-white">{overview.sciPapersAccepted}</span>
                            <span className="text-slate-600 text-xl">/</span>
                            <span className="text-3xl font-black text-primary-green">{overview.sciPapersPublished}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Scopus Papers</p>
                        <div className="flex items-baseline space-x-1">
                            <span className="text-3xl font-black text-white">{overview.scopusPapersAccepted}</span>
                            <span className="text-slate-600 text-xl">/</span>
                            <span className="text-3xl font-black text-primary-green">{overview.scopusPapersPublished}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Patents Published</p>
                        <span className="text-3xl font-black text-white block pt-4 border-t border-slate-800">{overview.patentPublished}</span>
                    </div>
                    <div className="space-y-2">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Patents Granted</p>
                        <span className="text-3xl font-black text-white block pt-4 border-t border-slate-800">{overview.patentGrant}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px]">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center"><Activity className="w-4 h-4 mr-2" /> Recent Weekly Trend</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={trendData}>
                            <defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient></defs>
                            <XAxis dataKey="month" hide />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#16a34a" fill="url(#colorCount)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[350px]">
                    <h3 className="font-bold text-slate-800 mb-4">Top Performing Staff</h3>
                    <div className="space-y-4 overflow-y-auto h-64 pr-2">
                         {topPerformers.map((s, i) => (
                             <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                 <div className="flex items-center gap-3">
                                     <span className="text-xs font-black text-white bg-slate-400 w-6 h-6 rounded-full flex items-center justify-center">{i+1}</span>
                                     <span className="font-bold text-slate-700 text-sm">{s.name}</span>
                                 </div>
                                 <span className="text-primary-green font-black text-sm">{s.totalScore} PTS</span>
                             </div>
                         ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderStaffPerformance = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {[
                    { label: 'Total Staff', value: staffStats.summary.totalStaff, icon: Users, color: 'blue' },
                    { label: 'Total Papers', value: staffStats.summary.totalPapers, icon: FileText, color: 'emerald' },
                    { label: 'Projects', value: staffStats.summary.totalProjects, icon: Activity, color: 'purple' },
                    { label: 'Patents', value: staffStats.summary.totalPatents, icon: Award, color: 'amber' },
                    { label: 'Books', value: staffStats.summary.totalBooks, icon: Book, color: 'rose' },
                    { label: 'Top Performer', value: staffStats.summary.topPerformer, icon: Award, color: 'teal', isSmall: true }
                ].map((card, i) => (
                    <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 group hover:scale-[1.02] transition-transform">
                        <card.icon className={`w-5 h-5 text-${card.color}-600 mb-2`} />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
                        <h4 className={`font-black text-slate-800 mt-1 truncate ${card.isSmall ? 'text-sm' : 'text-xl'}`}>{card.value || 0}</h4>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Month</label>
                    <select value={filters.month} onChange={e => setFilters({...filters, month: parseInt(e.target.value)})} className="w-full p-2 border rounded-lg bg-slate-50 outline-none">
                        {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Year</label>
                    <select value={filters.year} onChange={e => setFilters({...filters, year: parseInt(e.target.value)})} className="w-full p-2 border rounded-lg bg-slate-50 outline-none">
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="flex-1 min-w-[150px]">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Department</label>
                    <select value={filters.dept} onChange={e => setFilters({...filters, dept: e.target.value})} className="w-full p-2 border rounded-lg bg-slate-50 outline-none">
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div className="flex-2 min-w-[200px]">
                    <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block">Search Staff</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input type="text" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} placeholder="Search name..." className="w-full pl-10 pr-4 py-2 border rounded-lg bg-slate-50 outline-none" />
                    </div>
                </div>
                <button onClick={handleApplyFilters} className="bg-primary-green text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 h-[42px]">Apply</button>
                <button onClick={() => setFilters({month: 4, year: 2026, dept: 'All', rating: 'All', search: ''})} className="bg-slate-100 text-slate-600 px-6 py-2 rounded-lg font-bold h-[42px]">Clear</button>
            </div>

            {/* Performance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#1e3a5f] text-white">
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">S.No</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Name</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Dept</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Designation</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">SCI</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Scopus</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Conf.</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Patents (F/G)</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Projects</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Funded</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Books</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Days</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Total</th>
                                <th className="p-3 text-[10px] font-black uppercase border border-slate-700">Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffStats.staffList.filter(s => s.name.toLowerCase().includes(filters.search.toLowerCase())).map((s, i) => (
                                <tr 
                                    key={i} 
                                    onClick={() => setSelectedStaff(s)}
                                    className={`cursor-pointer transition-all hover:scale-[1.01] ${i % 2 === 0 ? 'bg-[#dbeafe]' : 'bg-[#dcfce7]'}`}
                                >
                                    <td className="p-3 text-xs border border-white/30 text-center font-bold">{i + 1}</td>
                                    <td className="p-3 text-xs border border-white/30 font-black text-slate-800">{s.name}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-bold">{s.department}</td>
                                    <td className="p-3 text-[10px] border border-white/30 uppercase font-bold text-slate-500">{s.designation}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">{s.sciPapers}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">{s.scopusPapers}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">{s.conferencePapers}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">{s.patentsFiled}/{s.patentsGranted}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">{s.projectsApplied}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">Rs. {s.fundedAmount.toLocaleString()}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">{s.bookChapters}</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black">{s.submissionDays}/26</td>
                                    <td className="p-3 text-xs border border-white/30 text-center font-black bg-white/40">{s.totalActivities}</td>
                                    <td className="p-3 text-center border border-white/30">{getRatingBadge(s.rating)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Chart 1: Top 10 Staff */}
                 <div className="bg-white p-6 rounded-xl border h-[400px]">
                     <h4 className="font-black text-slate-800 mb-6 uppercase text-xs tracking-widest">Top 10 Performers ({months[filters.month-1]})</h4>
                     <ResponsiveContainer width="100%" height="90%">
                         <BarChart data={chartsData.top10Staff} layout="vertical" margin={{ left: 40 }}>
                             <XAxis type="number" hide />
                             <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontStyle: 'bold' }} />
                             <Tooltip cursor={{ fill: '#f8fafc' }} />
                             <Bar dataKey="value" fill="#16a34a" radius={[0, 10, 10, 0]} barSize={20} />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>

                 {/* Chart 2: Activity Types */}
                 <div className="bg-white p-6 rounded-xl border h-[400px]">
                     <h4 className="font-black text-slate-800 mb-6 uppercase text-xs tracking-widest">Research Output Distribution</h4>
                     <ResponsiveContainer width="100%" height="90%">
                         <PieChart>
                             <Pie data={chartsData.activityCounts} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                 {chartsData.activityCounts.map((entry, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                             </Pie>
                             <Tooltip />
                             <Legend verticalAlign="bottom" height={36} />
                         </PieChart>
                     </ResponsiveContainer>
                 </div>

                 {/* Chart 3: Dept Comparison */}
                 <div className="bg-white p-6 rounded-xl border h-[400px]">
                     <h4 className="font-black text-slate-800 mb-6 uppercase text-xs tracking-widest">Departmental Activity Load</h4>
                     <ResponsiveContainer width="100%" height="90%">
                         <BarChart data={chartsData.deptComparison}>
                             <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                             <YAxis hide />
                             <Tooltip />
                             <Bar dataKey="value" barSize={30} radius={[5, 5, 0, 0]}>
                                 {chartsData.deptComparison.map((entry, index) => <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                             </Bar>
                         </BarChart>
                     </ResponsiveContainer>
                 </div>

                 {/* Chart 4: Monthly Trend */}
                 <div className="bg-white p-6 rounded-xl border h-[400px]">
                     <h4 className="font-black text-slate-800 mb-6 uppercase text-xs tracking-widest">Research Submission Trend (6 Months)</h4>
                     <ResponsiveContainer width="100%" height="90%">
                         <LineChart data={chartsData.monthlyTrend}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                             <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                             <YAxis hide />
                             <Tooltip />
                             <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={4} dot={{ r: 6, fill: '#16a34a' }} />
                         </LineChart>
                     </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );

    const renderDeptReport = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#1e293b] text-white">
                                <th className="p-4 text-xs font-black uppercase">Department</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Total Staff</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Active Staff</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Papers</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Patents</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Projects</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Books</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Avg Rating</th>
                                <th className="p-4 text-center text-xs font-black uppercase">Completion %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {deptReport.map((dept, i) => {
                                const completion = parseFloat(dept.completionPercent);
                                let rowClass = 'bg-red-50 text-red-900';
                                if (completion >= 75) rowClass = 'bg-green-50 text-green-900';
                                else if (completion >= 50) rowClass = 'bg-yellow-50 text-yellow-900';

                                return (
                                    <tr key={i} className={`border-b border-white transition-all hover:brightness-95 ${rowClass}`}>
                                        <td className="p-4 font-black">{dept.department}</td>
                                        <td className="p-4 text-center font-bold">{dept.totalStaff}</td>
                                        <td className="p-4 text-center font-bold">{dept.activeStaff}</td>
                                        <td className="p-4 text-center font-bold">{dept.papers}</td>
                                        <td className="p-4 text-center font-bold">{dept.patents}</td>
                                        <td className="p-4 text-center font-bold">{dept.projects}</td>
                                        <td className="p-4 text-center font-bold">{dept.books}</td>
                                        <td className="p-4 text-center"><Badge variant="info">{dept.avgRating}</Badge></td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-black/10 h-1.5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-current" style={{ width: `${completion}%` }}></div>
                                                </div>
                                                <span className="text-xs font-black">{completion}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100 gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Analytics & Performance Portal</h1>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">CFRD Administrative Intelligence Suite</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-2 bg-[#1e3a5f] text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:brightness-110 shadow-lg shadow-blue-200"><Download size={14} /> Full PDF</button>
                    <button onClick={handleDownloadExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase hover:brightness-110 shadow-lg shadow-green-200"><Download size={14} /> Excel</button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-100 w-fit">
                {['Overview', 'Staff Performance', 'Department Report'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${activeTab === tab ? 'bg-primary-green text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Loading Indicator */}
            {loading ? (
                <div className="h-96 flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-green border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Aggregating Research Intelligence...</p>
                </div>
            ) : (
                <>
                    {activeTab === 'Overview' && renderOverview()}
                    {activeTab === 'Staff Performance' && renderStaffPerformance()}
                    {activeTab === 'Department Report' && renderDeptReport()}
                </>
            )}

            {/* Staff Detail Modal (PART 2 - D) */}
            <Modal isOpen={!!selectedStaff} onClose={() => setSelectedStaff(null)} title="Staff Performance Snapshot">
                {selectedStaff && (
                    <div className="space-y-6">
                        <div className="bg-slate-900 text-white p-6 rounded-2xl">
                             <div className="flex items-center gap-4 mb-4">
                                 <div className="w-16 h-16 bg-primary-green rounded-2xl flex items-center justify-center text-3xl font-black">{selectedStaff.name.charAt(0)}</div>
                                 <div>
                                     <h2 className="text-xl font-black">{selectedStaff.name}</h2>
                                     <p className="text-slate-400 text-xs uppercase font-bold">{selectedStaff.designation} | Dept of {selectedStaff.department}</p>
                                 </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                 <div className="p-3 bg-white/5 rounded-xl">
                                     <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Total Activities</p>
                                     <p className="text-xl font-black">{selectedStaff.totalActivities}</p>
                                 </div>
                                 <div className="p-3 bg-white/5 rounded-xl">
                                     <p className="text-[10px] uppercase text-slate-500 font-bold mb-1">Performance Rating</p>
                                     <div className="mt-1">{getRatingBadge(selectedStaff.rating)}</div>
                                 </div>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'SCI Papers', value: selectedStaff.sciPapers, icon: FileText },
                                { label: 'Scopus', value: selectedStaff.scopusPapers, icon: FileText },
                                { label: 'Projects', value: selectedStaff.projectsApplied, icon: Activity },
                                { label: 'Patents', value: `${selectedStaff.patentsFiled}/${selectedStaff.patentsGranted}`, icon: Award },
                                { label: 'Book Chapters', value: selectedStaff.bookChapters, icon: Book },
                                { label: 'Submission Days', value: `${selectedStaff.submissionDays}/26`, icon: Calendar }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-xl bg-slate-50">
                                    <div className="flex items-center gap-2">
                                        <item.icon size={16} className="text-slate-400" />
                                        <span className="text-xs font-bold text-slate-600">{item.label}</span>
                                    </div>
                                    <span className="font-black text-slate-800">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => {
                                    window.open(`${import.meta.env.VITE_API_URL}/reports/staff-summary?staffId=${selectedStaff._id}`, '_blank');
                                    toast.success("Generating staff snapshot PDF...");
                                }}
                                className="flex-1 bg-primary-green text-white py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2"
                            >
                                <Download size={14} /> Download PDF
                            </button>
                            <button onClick={() => setSelectedStaff(null)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-black uppercase text-xs">Close</button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Hidden Logo for PDF */}
            <img
                id="analytics-logo"
                crossOrigin="anonymous"
                src="/images/JJCET_LOGO.png"
                alt="logo"
                style={{ display: 'none' }}
            />
        </div>
    );
};

export default Analytics;
