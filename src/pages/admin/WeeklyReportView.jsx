import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { adminAPI } from '../../api';
import { startOfWeek, addDays, format, isSameDay, parseISO } from 'date-fns';
import { RefreshCw, ArrowLeft, Edit3, Save, RotateCcw, Loader2, FileSpreadsheet, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ─── Status dot component ──────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
    const colors = {
        approved: 'bg-green-500',
        pending:  'bg-yellow-400',
        rejected: 'bg-red-500',
    };
    const labels = {
        approved: '✅',
        pending:  '⏳',
        rejected: '❌',
    };
    return (
        <span
            className={`inline-block w-2 h-2 rounded-full mr-1.5 shrink-0 ${colors[status] || 'bg-gray-400'}`}
            title={status}
        />
    );
};

// ─── Auto-resize textarea ──────────────────────────────────────────────────────
const AutoResizeTextarea = ({ value, onChange, disabled }) => {
    const textareaRef = useRef(null);
    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; }
    }, [value]);
    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="w-full p-2 border border-gray-300 rounded focus:ring-1 focus:ring-primary-green focus:border-primary-green outline-none resize-none text-[12px] font-serif leading-tight bg-white min-h-[60px]"
            placeholder="Enter tasks (one per line)..."
        />
    );
};

// ─── Main component ────────────────────────────────────────────────────────────
const WeeklyReportView = ({ onBack }) => {
    const [staffList, setStaffList]   = useState([]);
    const [tasks, setTasks]           = useState([]);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [saving, setSaving]         = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const [editedData, setEditedData]     = useState({});
    const [originalData, setOriginalData] = useState({});
    // rawTaskMap: { `staffId_dateKey`: TaskEntry[] } — for status dots
    const [rawTaskMap, setRawTaskMap] = useState({});

    // Current week: Monday → Saturday (6 days)
    const weekDates = useMemo(() => {
        const today = new Date();
        const monday = startOfWeek(today, { weekStartsOn: 1 });
        return Array.from({ length: 6 }, (_, i) => addDays(monday, i));
    }, []);

    const dateRangeStr = `${format(weekDates[0], 'dd.MM.yyyy')} to ${format(weekDates[5], 'dd.MM.yyyy')}`;

    // ── Garbage cleaner ────────────────────────────────────────────────────────
    const cleanGarbageValue = (phrase) => {
        if (!phrase) return false;
        const p = phrase.trim();
        if (p.length < 3) return false;
        const low = p.toLowerCase();
        if (['ni', 'hi', 'ok', 'yes', 'no', 'ok.', 'nil', 'null'].includes(low)) return false;
        if (!/[a-zA-Z]/.test(p)) return false;
        return true;
    };

    // ── Summary generator ──────────────────────────────────────────────────────
    const generateInitialSummary = (filteredTasks) => {
        if (filteredTasks.length === 0) return '';

        const correctionTask = filteredTasks.find(t => t.summaryCorrection && t.summaryCorrection.trim() !== '');
        if (correctionTask) {
            const rawSentences = correctionTask.summaryCorrection.split('\n');
            const cleaned = rawSentences
                .map(s => s.replace(/^\d+\.\s*/, '').trim())
                .filter(cleanGarbageValue);
            return cleaned.map((s, i) => `${i + 1}. ${s}`).join('\n');
        }

        const sentences = [];
        filteredTasks.forEach(task => {
            if (task.paperTitle)   sentences.push(`Paper entitled "${task.paperTitle}" has been ${task.paperStatus || 'submitted'} to the journal "${task.journalName || ''}" (IF: ${task.impactFactor || ''}).`);
            if (task.projectName)  sentences.push(`Funded project entitled "${task.projectName}" to "${task.fundingAgency || ''}" for grant of Rs. ${task.fundingAmount || task.grantAmount || ''} (Status: ${task.projectStatus || ''}).`);
            if (task.patentTitle)  sentences.push(`Prepared a "${task.patentType || 'Utility/Design'}" patent entitled "${task.patentTitle}" of application No."${task.applicationNumber || ''}" with page No."${task.pageNumber || ''}" under Indian Patent Publication.`);
            if (task.bookTitle)    sentences.push(`Book Chapter entitled "${task.bookTitle}" has been ${task.bookStatus || 'published'} in "${task.publisherName || ''}" with ISBN No."${task.isbnNumber || ''}".`);
            if (task.activityTitle) sentences.push(task.activityTitle);
            for (let i = 1; i <= 5; i++) {
                const w = task[`additionalWorkload${i}`];
                if (w && w.trim() !== '') sentences.push(w.trim());
            }
        });

        const uniqueSentences = sentences
            .filter((v, i, a) => a.indexOf(v) === i)
            .filter(cleanGarbageValue);

        return uniqueSentences.map((s, i) => `${i + 1}. ${s}`).join('\n');
    };

    // ── Fetch data ─────────────────────────────────────────────────────────────
    const fetchData = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const matrixData = await adminAPI.getWeeklyMatrix();

            const fetchedStaff = matrixData.map(m => m.staff).filter(Boolean);
            setStaffList(fetchedStaff);

            const dataObj = {};
            const taskMap = {};
            const allTasksArr = [];

            matrixData.forEach(row => {
                if (!row.staff) return;
                const staff = row.staff;
                const reports = row.reports || [];

                weekDates.forEach(date => {
                    const dateKey = format(date, 'yyyy-MM-dd');
                    const key = `${staff._id}_${dateKey}`;
                    const targetDateStr = format(date, 'dd.MM.yyyy');

                    const filtered = reports.filter(r => {
                        if (!r.date) return false;
                        const rDateStr = format(new Date(r.date), 'dd.MM.yyyy');
                        return rDateStr === targetDateStr;
                    });

                    taskMap[key] = filtered;
                    dataObj[key] = generateInitialSummary(filtered);
                    allTasksArr.push(...filtered);
                });
            });

            setRawTaskMap(taskMap);
            setEditedData(dataObj);
            setOriginalData(dataObj);
            setTasks(allTasksArr);
            setLastRefreshed(new Date());

            if (isManualRefresh) toast.success('✅ Report refreshed!');
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load weekly report data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [weekDates]);

    // Initial load
    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-refresh every 60 seconds (only when NOT in edit mode)
    useEffect(() => {
        if (isEditMode) return;
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, [isEditMode, fetchData]);

    // ── Cell edit ──────────────────────────────────────────────────────────────
    const handleCellChange = (staffId, dateKey, value) => {
        setEditedData(prev => ({ ...prev, [`${staffId}_${dateKey}`]: value }));
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        const convertDate = (dateStr) => {
            if (!dateStr) return null;
            if (dateStr.includes('.')) {
                const parts = dateStr.split('.');
                if (parts.length === 3) {
                    return `${parts[2]}-${parts[1]}-${parts[0]}`;
                }
            }
            return dateStr;
        };

        const edits = [];
        Object.keys(editedData).forEach(key => {
            if (editedData[key] !== originalData[key]) {
                const lastUnder = key.lastIndexOf('_');
                if (lastUnder > -1) {
                    const staffId = key.substring(0, lastUnder);
                    const rawDate = key.substring(lastUnder + 1);
                    const date = convertDate(rawDate);
                    edits.push({ staffId, date, content: editedData[key] });
                }
            }
        });

        if (edits.length === 0) { setIsEditMode(false); return; }

        setSaving(true);
        try {
            await adminAPI.bulkUpdateMatrix(edits);

            toast.success('Report saved successfully ✅');
            setOriginalData({ ...editedData });
            setIsEditMode(false);
            await fetchData();
        } catch (error) {
            const errorMsg = error.message || 'Failed to save';
            console.error('Save error:', error, errorMsg);
            toast.error(`Error: ${errorMsg} ❌`);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (window.confirm('Restore original data from the database? This will clear all current edits.')) {
            fetchData();
            setIsEditMode(false);
            toast.success('Data restored from database');
        }
    };

    // ── PDF Download (jsPDF + autoTable) ───────────────────────────────────
    const handleDownloadPDF = async () => {

        // GARBAGE FILTER
        const cleanText = (text) => {
            if (!text || text.trim().length < 8) return null;
            const badWords = [
                'ReferenceError','undefined','require','CommonJS',
                'NEXORACTE','N:\\CFRD','routes.js','sneaky',
                'ChatGPT','Copilot','paste into','perfect prompt',
                'HOW TO USE','FINAL UNDERSTANDING','upgrade your',
                'Copy this prompt','frontend download','add analytics',
                'Ethan submits','next level','exact report system'
            ];
            for (const word of badWords) {
                if (text.includes(word)) return null;
            }
            if (text.trim().length > 150) return text.trim().substring(0, 150) + '...';
            return text.trim();
        };

        // GET CELL TEXT
        const getCellText = (staff, dateKey) => {
            const content = editedData[`${staff._id}_${dateKey}`] || '';
            const tasks = content.split('\n');
            if (!tasks || tasks.length === 0) return 'Not Entered';
            const cleaned = tasks.map(t => cleanText(t)).filter(Boolean);
            if (cleaned.length === 0) return 'Not Entered';
            return cleaned.map((t, i) => `${i + 1}. ${t}`).join('\n');
        };

        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        // LOGO
        try {
            const logoEl = document.getElementById('report-logo');
            const canvas = document.createElement('canvas');
            canvas.width = logoEl.naturalWidth;
            canvas.height = logoEl.naturalHeight;
            canvas.getContext('2d').drawImage(logoEl, 0, 0);
            doc.addImage(canvas.toDataURL('image/png'), 'PNG', 100, 3, 90, 25);
        } catch (e) {
            console.warn('Logo not loaded', e);
        }

        // TITLE
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(
            `Center for Research and Development - Weekly Report (${dateRangeStr})`,
            148, 33, { align: 'center' }
        );

        // TABLE ROWS
        const tableRows = staffList.map((staff, i) => [
            i + 1,
            staff.name,
            `${staff.designation || 'Asst Prof'}\n${staff.department || ''}`,
            ...weekDates.map(d => getCellText(staff, format(d, 'yyyy-MM-dd')))
        ]);

        const headers = [
            'S.No','Name','Designation',
            ...weekDates.map(d => format(d, 'dd.MM.yyyy'))
        ];

        // AUTO TABLE
        autoTable(doc, {
            head: [headers],
            body: tableRows,
            startY: 37,
            rowPageBreak: 'auto',
            showHead: 'everyPage',
            margin: { top: 8, left: 5, right: 5, bottom: 12 },
            styles: {
                fontSize: 7,
                cellPadding: 2,
                valign: 'top',
                overflow: 'linebreak',
                lineColor: [0, 0, 0],
                lineWidth: 0.2,
            },
            headStyles: {
                fillColor: [30, 58, 95],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
                cellPadding: 3,
            },
            columnStyles: {
                0: { cellWidth: 8,  halign: 'center' },
                1: { cellWidth: 24, fontStyle: 'bold' },
                2: { cellWidth: 23 },
                3: { cellWidth: 38 },
                4: { cellWidth: 38 },
                5: { cellWidth: 38 },
                6: { cellWidth: 38 },
                7: { cellWidth: 38 },
                8: { cellWidth: 38 },
            },
            didParseCell: (data) => {
                if (data.section !== 'body') return;
                const val = data.cell.raw;
                const isEven = data.row.index % 2 === 0;
                if (val === 'Not Entered') {
                    data.cell.styles.fillColor = [254, 226, 226];
                    data.cell.styles.textColor = [220, 38, 38];
                    data.cell.styles.fontStyle = 'bolditalic';
                } else {
                    data.cell.styles.fillColor = isEven
                        ? [219, 234, 254]
                        : [220, 252, 231];
                    data.cell.styles.textColor = [0, 0, 0];
                }
            },
            didDrawPage: (data) => {
                doc.setFontSize(8);
                doc.setTextColor(120);
                doc.text(
                    `Page ${data.pageNumber}`,
                    148,
                    doc.internal.pageSize.height - 4,
                    { align: 'center' }
                );
            },
        });

        // SIGNATURE — last page only
        const finalY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'normal');
        doc.text('_______________________', 15, finalY);
        doc.text('Dean', 15, finalY + 6);
        doc.text('Research and Development', 15, finalY + 11);
        doc.text('_______________________', 235, finalY);
        doc.text('Principal', 235, finalY + 6);

        doc.save('CFRD_Weekly_Report.pdf');
    };

    // ── Excel Download ─────────────────────────────────────────────────────────

    const handleDownloadExcel = () => {
        const worksheetData = [
            ['S.No', 'Name', 'Designation', ...weekDates.map(d => format(d, 'dd.MM.yyyy'))]
        ];
        staffList.forEach((staff, sIdx) => {
            const row = [sIdx + 1, staff.name, `${staff.designation || 'Asst Prof'} / ${staff.department}`];
            weekDates.forEach(date => {
                const dateKey = format(date, 'yyyy-MM-dd');
                const key = `${staff._id}_${dateKey}`;
                row.push(editedData[key] || 'Not Entered');
            });
            worksheetData.push(row);
        });
        const ws = XLSX.utils.aoa_to_sheet(worksheetData);
        ws['!cols'] = [{ wch: 5 }, { wch: 25 }, { wch: 25 }, ...weekDates.map(() => ({ wch: 40 }))];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Weekly Report');
        XLSX.writeFile(wb, 'CFRD_Weekly_Report.xlsx');
    };

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getStatusForKey = (key) => {
        const entries = rawTaskMap[key] || [];
        if (entries.length === 0) return null;
        if (entries.some(t => t.status === 'approved')) return 'approved';
        if (entries.some(t => t.status === 'pending'))  return 'pending';
        return entries[0]?.status || null;
    };

    // ── Loading ────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 size={40} className="animate-spin text-primary-green mb-4" />
                <p className="text-gray-500 font-medium">Generating Weekly Matrix...</p>
            </div>
        );
    }

    return (
        <div className="weekly-report-container bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            {/* ── Action Bar ── */}
            <div className="p-4 border-b flex justify-between items-center print:hidden bg-gray-50 flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                        <ArrowLeft size={18} /> Back
                    </button>

                    {/* Edit / Save */}
                    {!isEditMode ? (
                        <button
                            onClick={() => setIsEditMode(true)}
                            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium border border-blue-200"
                        >
                            <Edit3 size={18} /> ✏️ Edit Report
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2 bg-primary-green text-white rounded-lg hover:bg-green-700 transition-all shadow-md font-bold disabled:opacity-50"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                ✅ Save Changes
                            </button>
                            <button onClick={() => setIsEditMode(false)} disabled={saving} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">
                                Cancel
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleReset}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
                        title="Restore original data from API"
                    >
                        <RotateCcw size={18} /> 🗄️ Reset
                    </button>

                    {/* 🔄 Refresh button */}
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing || saving || isEditMode}
                        className="flex items-center gap-2 px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all border border-indigo-200 font-medium disabled:opacity-50"
                        title="Refresh data from server"
                    >
                        <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                        🔄 Refresh
                    </button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    {/* Last refreshed */}
                    <span className="text-xs text-gray-400 hidden sm:block">
                        Last updated: {format(lastRefreshed, 'hh:mm:ss a')}
                        <span className="ml-1 text-indigo-400">(auto every 60s)</span>
                    </span>

                    <button
                        onClick={handleDownloadExcel}
                        disabled={isEditMode || saving}
                        className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
                    >
                        <FileSpreadsheet size={18} /> 📊 Excel
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isEditMode || saving}
                        className="flex items-center gap-2 px-5 py-2 text-white rounded-lg hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
                        style={{ backgroundColor: '#1a1a2e' }}
                    >
                        <FileText size={18} /> 📥 PDF
                    </button>
                </div>
            </div>

            {/* ── Status Legend ── */}
            <div className="px-5 py-2 bg-white border-b flex items-center gap-5 text-xs text-gray-500 print:hidden flex-wrap">
                <span className="font-semibold text-gray-600">Status:</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Approved</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block"></span> Pending</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Rejected</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block"></span> Not Entered</span>
                <span className="ml-auto text-gray-400">Total staff: <strong className="text-gray-700">{staffList.length}</strong></span>
            </div>

            {/* ── Report Content (captured by html2pdf) ── */}
            <div id="weekly-report-content" className="report-content p-8 md:p-12 overflow-x-auto print:p-0">
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        @page { size: A4 landscape; margin: 10mm; }
                        body { background: white !important; }
                        .print\\:hidden { display: none !important; }
                        .report-content { padding: 0 !important; width: 100% !important; margin: 0 !important; }
                    }
                    #weekly-report-content .weekly-table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                        font-family: 'Arial', sans-serif;
                        background-color: white;
                    }
                    #weekly-report-content thead {
                        display: table-header-group !important;
                    }
                    #weekly-report-content .weekly-table th,
                    #weekly-report-content .weekly-table td {
                        border: 1px solid #000;
                        padding: 6px 8px;
                        vertical-align: top;
                        font-size: 11px;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        word-break: break-word;
                    }
                    #weekly-report-content .weekly-table th {
                        background-color: #1a1a2e !important;
                        color: white !important;
                        font-weight: bold;
                        text-align: center;
                        text-transform: uppercase;
                        font-size: 11px;
                    }
                    #weekly-report-content .weekly-table tr {
                        page-break-inside: avoid !important;
                        page-break-before: auto;
                    }
                    #weekly-report-content .weekly-table tr:nth-child(odd)  { background-color: #c8e6fa !important; }
                    #weekly-report-content .weekly-table tr:nth-child(even) { background-color: #c8f0c8 !important; }
                    #weekly-report-content .not-entered { color: #cc0000; font-style: italic; font-weight: bold; }
                    #weekly-report-content .not-entered-cell { background-color: #ffb3b3 !important; }
                    #weekly-report-content .staff-info-cell { font-weight: bold; }
                    #weekly-report-content .task-list { margin:0; padding-left:0; list-style-type:none; }
                    #weekly-report-content .task-list li { margin-bottom:3px; line-height:1.3; white-space:pre-wrap; }
                    #weekly-report-content .report-header { text-align:center; margin-bottom:25px; }
                    #weekly-report-content .report-header img { height:85px; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto; }
                    #weekly-report-content .report-header h2 { font-size:17px; font-weight:bold; color:#000; margin:0; }
                    #weekly-report-content .report-footer { margin-top:35px; display:flex; justify-content:space-between; page-break-inside:avoid; }
                    #weekly-report-content .footer-col { text-align:center; width:200px; }
                    #weekly-report-content .signature-line { border-top:1px solid #000; margin-bottom:5px; padding-top:5px; font-weight:bold; }
                    /* Hide status dots in PDF */
                    #weekly-report-content .status-dot-wrap { display:none; }
                `}} />

                {/* Header */}
                <div className="report-header">
                    <img
                        id="report-logo"
                        src="/images/logo-jjcet.jpg"
                        alt="JJ College Logo"
                        crossOrigin="anonymous"
                    />
                    <h2>Center for Research and Development - Weekly Report ({dateRangeStr})</h2>
                </div>

                {/* Matrix Table */}
                <table className="weekly-table">
                    <thead>
                        <tr>
                            <th style={{ width: '3.2%' }}>S.No</th>
                            <th style={{ width: '10%' }}>Name</th>
                            <th style={{ width: '9%' }}>Designation</th>
                            {weekDates.map((date, idx) => (
                                <th key={idx} style={{ width: '12.8%' }}>{format(date, 'dd.MM.yyyy')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {staffList.map((staff, sIdx) => (
                            <tr key={staff._id}>
                                <td style={{ textAlign: 'center', width: '3.2%' }}>{sIdx + 1}</td>
                                <td className="staff-info-cell" style={{ width: '10%' }}>{staff.name}</td>
                                <td className="staff-info-cell" style={{ width: '9%' }}>{staff.designation || 'Asst Prof'} / {staff.department}</td>

                                {weekDates.map((date, dIdx) => {
                                    const dateKey = format(date, 'yyyy-MM-dd');
                                    const key = `${staff._id}_${dateKey}`;
                                    const content = editedData[key] || '';
                                    const isNotEntered = !content.trim();
                                    const taskStatus = getStatusForKey(key);
                                    const cellTasks = rawTaskMap[key] || [];

                                    return (
                                        <td key={dIdx} className={isNotEntered ? 'not-entered-cell' : ''} style={{ width: '12.8%' }}>
                                            {isEditMode ? (
                                                <AutoResizeTextarea
                                                    value={content}
                                                    onChange={(val) => handleCellChange(staff._id, dateKey, val)}
                                                    disabled={saving}
                                                />
                                            ) : (
                                                <>
                                                    {!isNotEntered ? (
                                                        <>
                                                            {/* Status dot (screen only) */}
                                                            <div className="status-dot-wrap flex items-center gap-1 mb-1 print:hidden">
                                                                {taskStatus && <StatusDot status={taskStatus} />}
                                                                <span className="text-[10px] text-gray-400 capitalize">{taskStatus}</span>
                                                                {cellTasks.length > 1 && (
                                                                    <span className="text-[9px] bg-indigo-100 text-indigo-700 rounded px-1 ml-1">
                                                                        {cellTasks.length} entries
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <ul className="task-list">
                                                                {content.split('\n').map((line, lIdx) => (
                                                                    <li key={lIdx}>{line}</li>
                                                                ))}
                                                            </ul>
                                                        </>
                                                    ) : (
                                                        <span className="not-entered">Not Entered</span>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="report-footer">
                    <div className="footer-col">
                        <div className="signature-line">__________________________</div>
                        <p className="font-bold">Dean</p>
                        <p className="text-xs">Research and Development</p>
                    </div>
                    <div className="footer-col">
                        <div className="signature-line">__________________________</div>
                        <p className="font-bold">Principal</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyReportView;
