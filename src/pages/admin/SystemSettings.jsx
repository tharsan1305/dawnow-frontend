import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import toast from 'react-hot-toast';
import { Save, Clock, ShieldCheck, Loader2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

// Convert 24h "HH:mm" to "h:mm AM/PM"
const to12h = (timeStr) => {
    if (!timeStr) return '5:00 PM';
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
};

// Validate: must be between 08:00 and 20:00
const isValidCutoff = (timeStr) => {
    if (!timeStr) return false;
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    const total = h * 60 + m;
    return total >= 8 * 60 && total <= 20 * 60;
};

const SystemSettings = () => {
    const [cutoffTime, setCutoffTime] = useState('17:00');
    const [savedCutoff, setSavedCutoff] = useState('17:00');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [applying, setApplying] = useState(false);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await adminAPI.getCutoffTime();
                if (data) {
                    const cutoff = data.value || '17:00';
                    setCutoffTime(cutoff);
                    setSavedCutoff(cutoff);
                }
            } catch (error) {
                console.error('Error fetching settings:', error);
                toast.error('Failed to load system settings');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleTimeChange = (value) => {
        setCutoffTime(value);
        if (!isValidCutoff(value)) {
            setValidationError('Cutoff time must be between 8:00 AM and 8:00 PM');
        } else {
            setValidationError('');
        }
    };

    const handleSave = async () => {
        if (!isValidCutoff(cutoffTime)) {
            toast.error('❌ Cutoff time must be between 8:00 AM (08:00) and 8:00 PM (20:00)');
            return;
        }
        setSaving(true);
        try {
            const res = await adminAPI.updateCutoffTime(cutoffTime);
            if (res) {
                setSavedCutoff(cutoffTime);
                toast.success(`✅ Cutoff saved: ${to12h(cutoffTime)}`);
            }
        } catch (error) {
            const msg = error.message || 'Failed to update setting';
            toast.error(`❌ ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const handleApplyToday = async () => {
        setApplying(true);
        try {
            const res = await adminAPI.bulkApproveToday();
            const { updated, cutoff } = res;
            if (updated > 0) {
                toast.success(`✅ ${updated} pending report(s) approved! (Submitted before ${to12h(cutoff)})`);
            } else {
                toast('ℹ️ No pending reports found for today before the cutoff.', { icon: '📋' });
            }
        } catch (error) {
            console.error('Error applying retroactive approval:', error);
            toast.error('Failed to apply retroactive approval ❌');
        } finally {
            setApplying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader2 size={40} className="animate-spin text-green-600 mb-4" />
                <p className="text-gray-500 font-medium">Loading system configurations...</p>
            </div>
        );
    }

    const hasChanges = cutoffTime !== savedCutoff;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-2">
                <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
                <p className="text-gray-500 text-sm">Configure global application rules and automation cutoff times.</p>
            </div>

            {/* Auto-Approval Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-green-800 p-4 flex items-center gap-3">
                    <Clock className="text-white" size={24} />
                    <h2 className="text-lg font-semibold text-white">Auto-Approval Time Rule</h2>
                </div>

                <div className="p-6 space-y-5">

                    {/* Current active cutoff display */}
                    <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                        <CheckCircle2 size={28} className="text-green-600 shrink-0" />
                        <div>
                            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Current Active Cutoff</p>
                            <p className="text-3xl font-bold text-green-900 leading-tight">{to12h(savedCutoff)}</p>
                            <p className="text-xs text-green-700 mt-1.5">
                                Weekday reports submitted <strong>before {to12h(savedCutoff)}</strong> → <span className="text-green-700 font-semibold">Auto-Approved ✅</span><br />
                                Submitted <strong>after {to12h(savedCutoff)}</strong> or on weekends → <span className="text-amber-700 font-semibold">Pending ⏳</span>
                            </p>
                        </div>
                    </div>

                    {/* Time picker + Save */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-green-600" />
                            <p className="font-semibold text-gray-800 text-sm">Change Cutoff Time</p>
                            <span className="text-xs text-gray-400 ml-1">(must be between 8:00 AM – 8:00 PM)</span>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex flex-col gap-1 flex-1">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="time"
                                        value={cutoffTime}
                                        min="08:00"
                                        max="20:00"
                                        onChange={(e) => handleTimeChange(e.target.value)}
                                        className={`text-2xl font-mono font-bold text-gray-800 border rounded-lg px-3 py-2 focus:ring-2 focus:outline-none cursor-pointer bg-white w-44 ${
                                            validationError
                                                ? 'border-red-400 focus:ring-red-300'
                                                : 'border-gray-300 focus:ring-green-400'
                                        }`}
                                    />
                                    <span className="text-lg font-semibold text-gray-600">=&nbsp;{to12h(cutoffTime)}</span>
                                </div>
                                {validationError && (
                                    <div className="flex items-center gap-1.5 text-red-600 text-xs mt-1">
                                        <AlertTriangle size={13} />
                                        {validationError}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving || !!validationError}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all ${
                                    hasChanges && !validationError
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                } disabled:opacity-60`}
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                {hasChanges ? 'Save Changes' : 'Saved'}
                            </button>
                        </div>
                    </div>

                    {/* Retroactive fix */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div>
                            <p className="font-semibold text-amber-900 text-sm flex items-center gap-2">
                                <RefreshCw size={15} className="text-amber-600" />
                                Fix Today's Pending Reports
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                                Finds all <strong>pending</strong> reports submitted <strong>today before {to12h(savedCutoff)}</strong> and approves them.
                                Use this if auto-approval wasn't working earlier today.
                            </p>
                        </div>
                        <button
                            onClick={handleApplyToday}
                            disabled={applying}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition-all disabled:opacity-60 whitespace-nowrap shrink-0"
                        >
                            {applying ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                            Apply to Today
                        </button>
                    </div>

                    {/* Info box */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
                        <span className="text-lg shrink-0">💡</span>
                        <div>
                            <p className="font-bold text-blue-900 mb-1.5">How auto-approval works:</p>
                            <ul className="list-disc ml-4 space-y-1 text-xs">
                                <li>Submit before <strong>{to12h(savedCutoff)}</strong> on Mon–Fri → <strong className="text-green-700">Instantly Approved</strong></li>
                                <li>Submit after <strong>{to12h(savedCutoff)}</strong> → <strong className="text-amber-700">Pending</strong> (admin must manually approve)</li>
                                <li>Weekend submissions → always <strong className="text-amber-700">Pending</strong> regardless of time</li>
                                <li>Changes take effect <strong>immediately</strong> for all future submissions</li>
                                <li>Valid range: <strong>8:00 AM – 8:00 PM</strong> only</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Placeholder future settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 grayscale pointer-events-none select-none">
                <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center h-28">
                    <p className="text-gray-400 italic text-sm">More settings coming soon...</p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center h-28">
                    <p className="text-gray-400 italic text-sm">Advanced Configuration</p>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
