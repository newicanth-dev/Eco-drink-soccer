const SUPABASE_URL = 'https://wiomaiuhbekbfsjlemqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpb21haXVoYmVrYmZzamxlbXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODQ0MjYsImV4cCI6MjExMDA2MDQyNn0.54Tft_ee1yAXSOhYOg2BmzYBHfFMJFjrLzXl0KUHiZ8';
const BUCKET_NAME = 'registration-slips';
const PAGE_SIZE = 25;

const ACTIVITY_LABELS = {
    '3v3': 'ฟุตบอล 3 คน',
    '1v1': 'ฟุตบอล 1 ต่อ 1',
    crossbar: 'ยิงชนคาน'
};

const AGE_LABELS = {
    u8_3v3: 'ไม่เกิน 8 ปี',
    u10_3v3: 'ไม่เกิน 10 ปี',
    u12_3v3: 'ไม่เกิน 12 ปี',
    '13-15_3v3': '13-15 ปี',
    '16-18_3v3': '16-18 ปี',
    '19-23_3v3': '19-23 ปี',
    open_3v3: 'ประชาชนทั่วไป',
    '8-10_1v1': '8-10 ปี',
    u12_1v1: 'ไม่เกิน 12 ปี',
    '13-15_1v1': '13-15 ปี',
    '16-18_1v1': '16-18 ปี',
    '19-23_1v1': '19-23 ปี',
    open_1v1: 'ประชาชนทั่วไป',
    '8-12_cb': '8-12 ปี',
    '13-15_cb': '13-15 ปี',
    '16-18_cb': '16-18 ปี',
    '19-23_cb': '19-23 ปี',
    open_cb: 'ประชาชนทั่วไป'
};

const STATUS_LABELS = {
    pending: 'รอตรวจสอบ',
    paid: 'ยืนยันชำระแล้ว',
    rejected: 'สลิปไม่ถูกต้อง',
    cancelled: 'ยกเลิก'
};

const supabaseClient = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
const loginPanel = document.getElementById('loginPanel');
const dashboardPanel = document.getElementById('dashboardPanel');
const loginForm = document.getElementById('loginForm');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');
const signOutButton = document.getElementById('signOutButton');
const refreshButton = document.getElementById('refreshButton');
const exportButton = document.getElementById('exportButton');
const activityFilter = document.getElementById('activityFilter');
const ageFilter = document.getElementById('ageFilter');
const statusFilter = document.getElementById('statusFilter');
const dateFrom = document.getElementById('dateFrom');
const dateTo = document.getElementById('dateTo');
const searchInput = document.getElementById('searchInput');
const registrationRows = document.getElementById('registrationRows');
const dashboardStatus = document.getElementById('dashboardStatus');
const pageLabel = document.getElementById('pageLabel');
const previousPage = document.getElementById('previousPage');
const nextPage = document.getElementById('nextPage');
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');
const auditHistory = document.getElementById('auditHistory');
const slipPreviewModal = document.getElementById('slipPreviewModal');
const slipPreviewStage = document.getElementById('slipPreviewStage');
const slipPreviewImage = document.getElementById('slipPreviewImage');
const slipPreviewError = document.getElementById('slipPreviewError');
const slipZoomLabel = document.getElementById('slipZoomLabel');
const slipDownloadLink = document.getElementById('slipDownloadLink');
const slipReviewForm = document.getElementById('slipReviewForm');
const slipPaymentStatus = document.getElementById('slipPaymentStatus');
const saveSlipStatusButton = document.getElementById('saveSlipStatusButton');
const slipReviewMessage = document.getElementById('slipReviewMessage');
const reviewForm = document.getElementById('reviewForm');
const reviewStatus = document.getElementById('reviewStatus');
const adminNote = document.getElementById('adminNote');
const reviewStatusMessage = document.getElementById('reviewStatusMessage');
const saveReviewButton = document.getElementById('saveReviewButton');
const registrationDeadlineForm = document.getElementById('registrationDeadlineForm');
const registrationDeadlineDate = document.getElementById('registrationDeadlineDate');
const registrationDeadlineTime = document.getElementById('registrationDeadlineTime');
const currentRegistrationDeadline = document.getElementById('currentRegistrationDeadline');
const deadlineSettingsStatus = document.getElementById('deadlineSettingsStatus');
const saveRegistrationDeadlineButton = document.getElementById('saveRegistrationDeadlineButton');
const registrationDeadlinePanel = document.getElementById('registrationDeadlinePanel');

let currentPage = 0;
let totalRows = 0;
let currentRequest = 0;
let activeRegistration = null;
let activeSlipRegistrationId = null;
let searchTimer;
let registrationDeadlineLoaded = false;

function showStatus(element, message, isError) {
    element.textContent = message;
    element.classList.remove('hidden', 'status-error', 'status-info');
    element.classList.add(isError ? 'status-error' : 'status-info');
}

function clearStatus(element) {
    element.textContent = '';
    element.classList.add('hidden');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function(character) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[character];
    });
}

function formatAmount(amount) {
    return Number(amount).toLocaleString('th-TH', {
        style: 'currency',
        currency: 'THB',
        maximumFractionDigits: 0
    });
}

function formatDate(value) {
    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok'
    }).format(new Date(value));
}

function formatRegistrationDeadline(value) {
    return new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'Asia/Bangkok'
    }).format(new Date(value)) + ' น. (เวลาไทย)';
}

function setDeadlineFormValue(value) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(new Date(value)).reduce(function(result, part) {
        result[part.type] = part.value;
        return result;
    }, {});
    registrationDeadlineDate.value = parts.year + '-' + parts.month + '-' + parts.day;
    registrationDeadlineTime.value = parts.hour + ':' + parts.minute;
}

async function loadRegistrationDeadline() {
    saveRegistrationDeadlineButton.disabled = true;
    try {
        const { data: isAdmin, error: permissionError } = await supabaseClient
            .rpc('is_registration_admin');
        if (permissionError) {
            throw permissionError;
        }
        if (isAdmin !== true) {
            throw new Error('บัญชีนี้ไม่ได้รับสิทธิ์ Admin');
        }
        const { data, error } = await supabaseClient
            .from('registration_settings')
            .select('deadline_at')
            .eq('id', 1)
            .single();
        if (error) {
            throw error;
        }
        if (!data || !Number.isFinite(Date.parse(data.deadline_at))) {
            throw new Error('ไม่พบเวลาปิดรับสมัครที่ถูกต้อง');
        }

        setDeadlineFormValue(data.deadline_at);
        currentRegistrationDeadline.textContent = 'ปิดรับ ' + formatRegistrationDeadline(data.deadline_at);
        registrationDeadlineLoaded = true;
        registrationDeadlinePanel.classList.remove('hidden');
        registrationDeadlineDate.disabled = false;
        registrationDeadlineTime.disabled = false;
        clearStatus(deadlineSettingsStatus);
        saveRegistrationDeadlineButton.disabled = false;
    } catch (error) {
        registrationDeadlineLoaded = false;
        registrationDeadlinePanel.classList.remove('hidden');
        registrationDeadlineDate.disabled = true;
        registrationDeadlineTime.disabled = true;
        currentRegistrationDeadline.textContent = 'โหลดกำหนดปิดรับไม่สำเร็จ';
        showStatus(deadlineSettingsStatus, 'โหลดกำหนดปิดรับสมัครไม่สำเร็จ: ' + error.message, true);
    }
}

function formatDateInput(value, endOfDay) {
    if (!value) {
        return null;
    }
    return value + (endOfDay ? 'T23:59:59.999+07:00' : 'T00:00:00.000+07:00');
}

function formatTeamMembers(names, phones) {
    if (!Array.isArray(names)) {
        return [];
    }
    return names.map(function(name, index) {
        const phone = Array.isArray(phones) ? phones[index] : '';
        return String(name) + (phone ? ' (' + String(phone) + ')' : '');
    });
}

function setAuthenticatedView(isAuthenticated) {
    loginPanel.classList.toggle('hidden', isAuthenticated);
    dashboardPanel.classList.toggle('hidden', !isAuthenticated);
    signOutButton.classList.toggle('hidden', !isAuthenticated);
}

function updateAgeFilter() {
    const activity = activityFilter.value;
    const previousValue = ageFilter.value;
    ageFilter.replaceChildren(new Option('ทุกรุ่นอายุ', ''));

    const ageOptions = Object.keys(AGE_LABELS).filter(function(age) {
        return !activity || age.endsWith(activity === 'crossbar' ? '_cb' : '_' + activity);
    });

    ageOptions.forEach(function(age) {
        ageFilter.add(new Option(AGE_LABELS[age], age));
    });
    ageFilter.disabled = !activity;
    ageFilter.value = ageOptions.includes(previousValue) ? previousValue : '';
}

function buildFilteredQuery(columns, withCount) {
    let query = supabaseClient
        .from('registrations')
        .select(columns, withCount ? { count: 'exact' } : undefined)
        .order('created_at', { ascending: false });

    if (activityFilter.value) {
        query = query.eq('activity_type', activityFilter.value);
    }
    if (ageFilter.value) {
        query = query.eq('age_group', ageFilter.value);
    }
    if (statusFilter.value) {
        query = query.eq('payment_status', statusFilter.value);
    }
    if (dateFrom.value) {
        query = query.gte('created_at', formatDateInput(dateFrom.value, false));
    }
    if (dateTo.value) {
        query = query.lte('created_at', formatDateInput(dateTo.value, true));
    }

    const term = searchInput.value
        .trim()
        .slice(0, 80)
        .replace(/[^\p{L}\p{N}\s-]/gu, '');
    if (term) {
        const pattern = '%' + term + '%';
        query = query.or([
            'team_name.ilike.' + pattern,
            'contact_name.ilike.' + pattern,
            'phone.ilike.' + pattern,
            'line_id.ilike.' + pattern
        ].join(','));
    }
    return query;
}

function detailItem(label, value, fullWidth) {
    return '<div class="detail-item' + (fullWidth ? ' detail-item-full' : '') + '">'
        + '<span class="detail-label">' + escapeHtml(label) + '</span>'
        + '<div class="detail-value">' + value + '</div></div>';
}

function renderTeamMembers(names, phones) {
    if (!Array.isArray(names) || !names.length) {
        return '';
    }

    const members = names.map(function(name, index) {
        const phone = Array.isArray(phones) ? phones[index] : '';
        return '<li class="team-member-card">'
            + '<span class="team-member-number">' + (index + 1) + '</span>'
            + '<div class="team-member-info">'
            + '<strong>' + escapeHtml(name || 'ไม่ระบุชื่อ') + '</strong>'
            + '<span class="team-member-phone">' + escapeHtml(phone || 'ไม่ระบุเบอร์โทร') + '</span>'
            + '</div></li>';
    }).join('');

    return '<ol class="team-member-grid">' + members + '</ol>';
}

function renderRows(rows, signedUrls) {
    if (!rows.length) {
        registrationRows.innerHTML = '<tr><td class="empty-state" colspan="8">ไม่พบข้อมูลสมัคร</td></tr>';
        return;
    }

    registrationRows.innerHTML = rows.map(function(row) {
        const slipUrl = signedUrls.get(row.slip_path);
        const slipLink = slipUrl
            ? '<button class="slip-link slip-preview-button" type="button" data-slip-url="'
                + escapeHtml(slipUrl) + '" data-registration-id="' + escapeHtml(row.id)
                + '" data-payment-status="' + escapeHtml(row.payment_status)
                + '">เปิดดูสลิป</button>'
            : '<span class="cell-subtitle">ไม่มีลิงก์สลิป</span>';
        const statusClass = 'status-' + row.payment_status;
        const teamMembers = Array.isArray(row.team_members) && row.team_members.length
            ? '<span class="cell-subtitle">สมาชิก: '
                + escapeHtml(formatTeamMembers(row.team_members, row.team_member_phones).join(', '))
                + '</span>'
            : '';

        return '<tr>'
            + '<td data-label="ผู้สมัคร / ทีม"><span class="cell-title">' + escapeHtml(row.team_name) + '</span>'
            + '<span class="cell-subtitle">' + escapeHtml(row.id) + '</span>' + teamMembers + '</td>'
            + '<td class="contact-cell" data-label="ข้อมูลติดต่อ"><span>' + escapeHtml(row.contact_name) + '</span>'
            + '<span>' + escapeHtml(row.phone) + '</span>'
            + '<span>LINE: ' + escapeHtml(row.line_id) + '</span></td>'
            + '<td data-label="รายการ / รุ่นอายุ"><span class="cell-title">' + escapeHtml(ACTIVITY_LABELS[row.activity_type] || row.activity_type) + '</span>'
            + '<span class="cell-subtitle">' + escapeHtml(AGE_LABELS[row.age_group] || row.age_group) + '</span></td>'
            + '<td class="amount-cell" data-label="ค่าสมัคร">' + escapeHtml(formatAmount(row.amount_thb)) + '</td>'
            + '<td data-label="สถานะ"><span class="status-badge ' + escapeHtml(statusClass) + '">'
            + escapeHtml(STATUS_LABELS[row.payment_status] || row.payment_status) + '</span></td>'
            + '<td data-label="วันที่สมัคร">' + escapeHtml(formatDate(row.created_at)) + '</td>'
            + '<td data-label="สลิป">' + slipLink + '</td>'
            + '<td data-label="จัดการ"><button class="button button-secondary review-row-button" type="button" data-registration-id="'
            + escapeHtml(row.id) + '">รายละเอียด / ตรวจ</button></td>'
            + '</tr>';
    }).join('');
}

async function loadSummary(requestId) {
    const { data, error } = await supabaseClient.rpc('registration_admin_summary');
    if (requestId !== currentRequest) {
        return;
    }
    if (error) {
        showStatus(dashboardStatus, 'โหลดสรุปยอดเงินไม่สำเร็จ: ' + error.message, true);
        return;
    }

    const totals = (data || []).reduce(function(result, row) {
        result.total += Number(row.total_count || 0);
        result.paid += Number(row.paid_amount || 0);
        result.pending += Number(row.pending_amount || 0);
        result.pendingCount += Number(row.pending_count || 0);
        result.activities[row.activity_type] = Number(row.total_count || 0);
        return result;
    }, { total: 0, paid: 0, pending: 0, pendingCount: 0, activities: {} });

    document.getElementById('paidAmount').textContent = formatAmount(totals.paid);
    document.getElementById('pendingAmount').textContent = formatAmount(totals.pending);
    document.getElementById('pendingCount').textContent = totals.pendingCount.toLocaleString('th-TH');
    document.getElementById('count3v3').textContent = (totals.activities['3v3'] || 0).toLocaleString('th-TH');
    document.getElementById('count1v1').textContent = (totals.activities['1v1'] || 0).toLocaleString('th-TH');
    document.getElementById('countCrossbar').textContent = (totals.activities.crossbar || 0).toLocaleString('th-TH');
}

async function loadRegistrations() {
    if (!supabaseClient) {
        showStatus(loginError, 'โหลดไลบรารี Supabase ไม่สำเร็จ กรุณารีโหลดหน้าเว็บ', true);
        return;
    }

    const requestId = ++currentRequest;
    clearStatus(dashboardStatus);
    registrationRows.innerHTML = '<tr><td class="empty-state" colspan="8">กำลังโหลดข้อมูล...</td></tr>';

    try {
        const permissionResult = await supabaseClient.rpc('is_registration_admin');
        if (requestId !== currentRequest) {
            return;
        }
        if (permissionResult.error || permissionResult.data !== true) {
            registrationRows.innerHTML = '<tr><td class="empty-state" colspan="8">บัญชีนี้ไม่ได้รับอนุญาตให้ดูข้อมูลสมัคร</td></tr>';
            totalRows = 0;
            document.getElementById('totalCount').textContent = '0';
            document.getElementById('count3v3').textContent = '—';
            document.getElementById('count1v1').textContent = '—';
            document.getElementById('countCrossbar').textContent = '—';
            document.getElementById('paidAmount').textContent = '—';
            document.getElementById('pendingAmount').textContent = '—';
            document.getElementById('pendingCount').textContent = '—';
            document.getElementById('resultSummary').textContent = 'ไม่มีสิทธิ์เข้าถึง';
            previousPage.disabled = true;
            nextPage.disabled = true;
            const detail = permissionResult.error ? ': ' + permissionResult.error.message : '';
            showStatus(dashboardStatus, 'บัญชีนี้ไม่ได้รับสิทธิ์ Admin โปรดเพิ่ม UUID ใน registration_admins' + detail, true);
            return;
        }

        let query = buildFilteredQuery(
            'id, team_name, team_members, team_member_phones, contact_name, phone, line_id, activity_type, age_group, amount_thb, slip_path, payment_status, admin_note, reviewed_at, reviewed_by, created_at',
            true
        );
        const first = currentPage * PAGE_SIZE;
        query = query.range(first, first + PAGE_SIZE - 1);
        const { data, error, count } = await query;
        if (requestId !== currentRequest) {
            return;
        }
        if (error) {
            throw new Error('โหลดรายการสมัครไม่สำเร็จ: ' + error.message);
        }

        const rows = data || [];
        totalRows = count || 0;
        document.getElementById('totalCount').textContent = totalRows.toLocaleString('th-TH');
        document.getElementById('resultSummary').textContent = 'แสดง ' + (totalRows ? first + 1 : 0)
            + '–' + Math.min(first + rows.length, totalRows) + ' จาก ' + totalRows + ' รายการ';
        pageLabel.textContent = 'หน้า ' + (currentPage + 1);
        previousPage.disabled = currentPage === 0;
        nextPage.disabled = first + rows.length >= totalRows;

        const signedUrls = new Map();
        const paths = Array.from(new Set(rows.map(function(row) { return row.slip_path; })));
        const results = await Promise.all(paths.map(async function(path) {
            try {
                const { data: signedData, error: signedError } = await supabaseClient.storage
                    .from(BUCKET_NAME)
                    .createSignedUrl(path, 60 * 5);
                return signedError
                    ? { path: path, error: signedError }
                    : { path: path, signedUrl: signedData.signedUrl };
            } catch (error) {
                return { path: path, error: error };
            }
        }));
        if (requestId !== currentRequest) {
            return;
        }
        const signedUrlErrors = [];
        results.forEach(function(result) {
            if (result.error) {
                signedUrlErrors.push(result.error.message);
            } else {
                signedUrls.set(result.path, result.signedUrl);
            }
        });
        renderRows(rows, signedUrls);
        if (signedUrlErrors.length) {
            showStatus(dashboardStatus, 'สร้างลิงก์สลิปบางรายการไม่สำเร็จ: ' + signedUrlErrors.join('; '), true);
        }
        await loadSummary(requestId);
    } catch (error) {
        if (requestId === currentRequest) {
            registrationRows.innerHTML = '<tr><td class="empty-state" colspan="8">โหลดข้อมูลไม่สำเร็จ</td></tr>';
            showStatus(dashboardStatus, error.message, true);
        }
    }
}

async function openRegistrationDetails(registrationId) {
    clearStatus(reviewStatusMessage);
    activeRegistration = null;
    detailModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    detailContent.innerHTML = '<p class="muted">กำลังโหลดรายละเอียด...</p>';
    auditHistory.textContent = 'กำลังโหลดประวัติ...';
    reviewForm.reset();
    saveReviewButton.disabled = true;

    try {
        const { data: row, error } = await supabaseClient
            .from('registrations')
            .select('id, team_name, team_members, team_member_phones, contact_name, phone, line_id, activity_type, age_group, amount_thb, slip_path, payment_status, admin_note, reviewed_at, reviewed_by, created_at')
            .eq('id', registrationId)
            .single();
        if (error) {
            throw error;
        }
        activeRegistration = row;

        let slipMarkup = 'ไม่มีไฟล์สลิป';
        const { data: signedData, error: signedError } = await supabaseClient.storage
            .from(BUCKET_NAME)
            .createSignedUrl(row.slip_path, 60 * 5);
        if (!signedError && signedData) {
            slipMarkup = '<button class="slip-link slip-preview-button" type="button" data-slip-url="'
                + escapeHtml(signedData.signedUrl) + '">เปิดดูสลิป (ลิงก์หมดอายุใน 5 นาที)</button>';
        } else if (signedError) {
            slipMarkup = 'เปิดลิงก์สลิปไม่สำเร็จ: ' + escapeHtml(signedError.message);
        }

        detailContent.innerHTML = detailItem('ทีม / ผู้สมัคร', escapeHtml(row.team_name))
            + (Array.isArray(row.team_members) && row.team_members.length
                ? detailItem('สมาชิกทีม (' + row.team_members.length + ' คน)',
                    renderTeamMembers(row.team_members, row.team_member_phones), true)
                : '')
            + detailItem('รหัสใบสมัคร', escapeHtml(row.id))
            + detailItem('ชื่อผู้ติดต่อ', escapeHtml(row.contact_name))
            + detailItem('เบอร์โทรศัพท์', escapeHtml(row.phone))
            + detailItem('LINE ID', escapeHtml(row.line_id))
            + detailItem('กิจกรรม', escapeHtml(ACTIVITY_LABELS[row.activity_type] || row.activity_type))
            + detailItem('รุ่นอายุ', escapeHtml(AGE_LABELS[row.age_group] || row.age_group))
            + detailItem('ค่าสมัคร', escapeHtml(formatAmount(row.amount_thb)))
            + detailItem('วันที่สมัคร', escapeHtml(formatDate(row.created_at)))
            + detailItem('ตรวจสอบล่าสุด', row.reviewed_at ? escapeHtml(formatDate(row.reviewed_at)) : 'ยังไม่ตรวจสอบ')
            + detailItem('หลักฐานการชำระเงิน', slipMarkup, true);
        reviewStatus.value = row.payment_status;
        adminNote.value = row.admin_note || '';
        saveReviewButton.disabled = false;
        await loadAuditHistory(row.id);
    } catch (error) {
        detailContent.innerHTML = '<p class="status-message status-error">โหลดรายละเอียดไม่สำเร็จ: '
            + escapeHtml(error.message) + '</p>';
        auditHistory.textContent = 'ไม่สามารถโหลดประวัติได้';
    }
}

async function loadAuditHistory(registrationId) {
    const { data, error } = await supabaseClient
        .from('registration_admin_audit')
        .select('action, old_payment_status, new_payment_status, old_admin_note, new_admin_note, admin_user_id, created_at')
        .eq('registration_id', registrationId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        auditHistory.textContent = 'โหลดประวัติไม่สำเร็จ: ' + error.message;
        return;
    }
    if (!data || !data.length) {
        auditHistory.textContent = 'ยังไม่มีประวัติการแก้ไข';
        return;
    }

    auditHistory.innerHTML = data.map(function(entry) {
        const isStatus = entry.action === 'status_changed';
        const description = isStatus
            ? 'เปลี่ยนสถานะจาก ' + (STATUS_LABELS[entry.old_payment_status] || entry.old_payment_status)
                + ' เป็น ' + (STATUS_LABELS[entry.new_payment_status] || entry.new_payment_status)
            : 'แก้ไขหมายเหตุ: "' + (entry.old_admin_note || 'ว่าง') + '" → "'
                + (entry.new_admin_note || 'ว่าง') + '"';
        return '<div class="audit-entry">' + escapeHtml(description)
            + '<span class="cell-subtitle">ผู้ดูแล: ' + escapeHtml(entry.admin_user_id || 'ไม่ทราบบัญชี') + '</span>'
            + '<time>' + escapeHtml(formatDate(entry.created_at)) + '</time></div>';
    }).join('');
}

async function exportCsv() {
    exportButton.disabled = true;
    exportButton.textContent = 'กำลังเตรียม...';
    clearStatus(dashboardStatus);

    try {
        let offset = 0;
        const allRows = [];
        while (true) {
            const { data, error } = await buildFilteredQuery(
                'id, team_name, team_members, team_member_phones, contact_name, phone, line_id, activity_type, age_group, amount_thb, payment_status, admin_note, created_at, reviewed_at',
                false
            ).range(offset, offset + 999);
            if (error) {
                throw error;
            }
            allRows.push.apply(allRows, data || []);
            if (!data || data.length < 1000) {
                break;
            }
            offset += data.length;
        }

        const columns = [
            ['รหัสสมัคร', 'id'],
            ['ชื่อทีม/ผู้สมัคร', 'team_name'],
            ['รายชื่อสมาชิกทีม', 'team_members'],
            ['เบอร์โทรสมาชิกทีม', 'team_member_phones'],
            ['ผู้ติดต่อ', 'contact_name'],
            ['โทรศัพท์', 'phone'],
            ['LINE ID', 'line_id'],
            ['กิจกรรม', 'activity_type'],
            ['รุ่นอายุ', 'age_group'],
            ['ยอด (บาท)', 'amount_thb'],
            ['สถานะ', 'payment_status'],
            ['หมายเหตุ', 'admin_note'],
            ['วันที่สมัคร', 'created_at'],
            ['ตรวจสอบล่าสุด', 'reviewed_at']
        ];
        const csvValue = function(value) {
            const text = String(value ?? '');
            const safeText = /^[\s\u0000-\u001f\u007f\uFEFF]*[=+\-@]/.test(text)
                ? "'" + text
                : text;
            return '"' + safeText.replace(/"/g, '""') + '"';
        };
        const csv = '\uFEFF' + [
            columns.map(function(column) { return csvValue(column[0]); }).join(','),
            ...allRows.map(function(row) {
                return columns.map(function(column) {
                    const key = column[1];
                    let value = row[key];
                    if (key === 'activity_type') {
                        value = ACTIVITY_LABELS[value] || value;
                    } else if (key === 'age_group') {
                        value = AGE_LABELS[value] || value;
                    } else if (key === 'payment_status') {
                        value = STATUS_LABELS[value] || value;
                    } else if (key === 'team_members') {
                        value = Array.isArray(value) ? value.join(' / ') : '';
                    } else if (key === 'team_member_phones') {
                        value = Array.isArray(value) ? value.join(' / ') : '';
                    } else if (key === 'created_at' || key === 'reviewed_at') {
                        value = value ? formatDate(value) : '';
                    }
                    return csvValue(value);
                }).join(',');
            })
        ].join('\r\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const dateParts = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(new Date()).reduce(function(parts, part) {
            parts[part.type] = part.value;
            return parts;
        }, {});
        link.download = 'registrations-' + dateParts.year + '-' + dateParts.month + '-' + dateParts.day + '.csv';
        link.click();
        URL.revokeObjectURL(url);
        showStatus(dashboardStatus, 'ส่งออก ' + allRows.length + ' รายการเป็น CSV แล้ว', false);
    } catch (error) {
        showStatus(dashboardStatus, 'ส่งออก CSV ไม่สำเร็จ: ' + error.message, true);
    } finally {
        exportButton.disabled = false;
        exportButton.textContent = 'ส่งออก CSV';
    }
}

registrationDeadlineForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    clearStatus(deadlineSettingsStatus);
    if (!supabaseClient || !registrationDeadlineLoaded) {
        showStatus(deadlineSettingsStatus, 'ยังโหลดกำหนดปิดรับสมัครไม่สำเร็จ กรุณารีเฟรชหน้าแล้วลองใหม่', true);
        return;
    }

    const deadlineValue = registrationDeadlineDate.value + 'T'
        + registrationDeadlineTime.value + ':00+07:00';
    const deadlineTimestamp = Date.parse(deadlineValue);
    if (!Number.isFinite(deadlineTimestamp)) {
        showStatus(deadlineSettingsStatus, 'กรุณาเลือกวันและเวลาปิดรับสมัครให้ถูกต้อง', true);
        return;
    }

    saveRegistrationDeadlineButton.disabled = true;
    saveRegistrationDeadlineButton.textContent = 'กำลังบันทึก...';
    try {
        const { data, error } = await supabaseClient
            .from('registration_settings')
            .update({ deadline_at: new Date(deadlineTimestamp).toISOString() })
            .eq('id', 1)
            .select('deadline_at')
            .single();
        if (error) {
            throw error;
        }
        if (!data) {
            throw new Error('ไม่มีการเปลี่ยนแปลงกำหนดปิดรับสมัคร');
        }

        setDeadlineFormValue(data.deadline_at);
        currentRegistrationDeadline.textContent = 'ปิดรับ ' + formatRegistrationDeadline(data.deadline_at);
        showStatus(deadlineSettingsStatus, 'บันทึกกำหนดปิดรับสมัครแล้ว มีผลทันที', false);
    } catch (error) {
        showStatus(deadlineSettingsStatus, 'บันทึกกำหนดปิดรับสมัครไม่สำเร็จ: ' + error.message, true);
    } finally {
        saveRegistrationDeadlineButton.disabled = false;
        saveRegistrationDeadlineButton.textContent = 'บันทึกกำหนดปิดรับ';
    }
});

loginForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    clearStatus(loginError);
    loginButton.disabled = true;
    loginButton.textContent = 'กำลังเข้าสู่ระบบ...';

    try {
        if (!supabaseClient) {
            throw new Error('โหลดไลบรารี Supabase ไม่สำเร็จ กรุณารีโหลดหน้าเว็บ');
        }
        const { error } = await supabaseClient.auth.signInWithPassword({
            email: loginForm.elements.email.value.trim(),
            password: loginForm.elements.password.value
        });
        if (error) {
            showStatus(loginError, 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message, true);
        }
    } catch (error) {
        showStatus(loginError, 'เข้าสู่ระบบไม่สำเร็จ: ' + error.message, true);
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'เข้าสู่ระบบ';
    }
});

signOutButton.addEventListener('click', async function() {
    signOutButton.disabled = true;
    try {
        const { error } = await supabaseClient.auth.signOut();
        if (error) {
            showStatus(dashboardStatus, 'ออกจากระบบไม่สำเร็จ: ' + error.message, true);
        }
    } catch (error) {
        showStatus(dashboardStatus, 'ออกจากระบบไม่สำเร็จ: ' + error.message, true);
    } finally {
        signOutButton.disabled = false;
    }
});

refreshButton.addEventListener('click', loadRegistrations);
exportButton.addEventListener('click', exportCsv);

[activityFilter, ageFilter, statusFilter, dateFrom, dateTo].forEach(function(filter) {
    filter.addEventListener('change', function() {
        if (filter === activityFilter) {
            updateAgeFilter();
        }
        currentPage = 0;
        loadRegistrations();
    });
});

searchInput.addEventListener('input', function() {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(function() {
        currentPage = 0;
        loadRegistrations();
    }, 300);
});

previousPage.addEventListener('click', function() {
    if (currentPage > 0) {
        currentPage -= 1;
        loadRegistrations();
    }
});

nextPage.addEventListener('click', function() {
    if ((currentPage + 1) * PAGE_SIZE < totalRows) {
        currentPage += 1;
        loadRegistrations();
    }
});

registrationRows.addEventListener('click', function(event) {
    const slipButton = event.target.closest('.slip-preview-button');
    if (slipButton) {
        openSlipPreview(
            slipButton.dataset.slipUrl,
            slipButton.dataset.registrationId,
            slipButton.dataset.paymentStatus
        );
        return;
    }
    const button = event.target.closest('.review-row-button');
    if (button) {
        openRegistrationDetails(button.dataset.registrationId);
    }
});

let slipBaseWidth = 0;
let slipZoom = 1;

function updateSlipZoom() {
    if (!slipBaseWidth) {
        return;
    }
    slipPreviewImage.style.width = Math.round(slipBaseWidth * slipZoom) + 'px';
    slipZoomLabel.textContent = Math.round(slipZoom * 100) + '%';
}

function fitSlipToStage() {
    if (!slipPreviewImage.naturalWidth || !slipPreviewImage.naturalHeight) {
        return;
    }
    const availableWidth = Math.max(slipPreviewStage.clientWidth - 24, 1);
    const availableHeight = Math.max(slipPreviewStage.clientHeight - 24, 1);
    const widthAtHeight = slipPreviewImage.naturalWidth
        * availableHeight / slipPreviewImage.naturalHeight;
    slipBaseWidth = Math.min(slipPreviewImage.naturalWidth, availableWidth, widthAtHeight);
    slipZoom = 1;
    updateSlipZoom();
    slipPreviewStage.scrollTop = 0;
    slipPreviewStage.scrollLeft = 0;
}

function changeSlipZoom(amount) {
    slipZoom = Math.min(4, Math.max(0.5, slipZoom + amount));
    updateSlipZoom();
}

function openSlipPreview(url, registrationId, paymentStatus) {
    slipPreviewError.classList.add('hidden');
    clearStatus(slipReviewMessage);
    slipReviewForm.reset();
    activeSlipRegistrationId = registrationId;
    slipPaymentStatus.value = paymentStatus || 'pending';
    saveSlipStatusButton.disabled = !registrationId;
    slipPreviewImage.classList.remove('hidden');
    slipPreviewImage.style.width = '';
    slipBaseWidth = 0;
    slipZoom = 1;
    slipZoomLabel.textContent = '100%';
    slipDownloadLink.href = url;
    slipDownloadLink.hidden = false;
    slipPreviewImage.src = url;
    slipPreviewModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    if (slipPreviewImage.complete && slipPreviewImage.naturalWidth) {
        window.requestAnimationFrame(fitSlipToStage);
    }
}

function closeSlipPreview() {
    slipPreviewModal.classList.add('hidden');
    slipPreviewImage.removeAttribute('src');
    slipPreviewImage.style.width = '';
    slipDownloadLink.removeAttribute('href');
    slipDownloadLink.hidden = true;
    slipBaseWidth = 0;
    activeSlipRegistrationId = null;
    document.body.style.overflow = detailModal.classList.contains('hidden') ? '' : 'hidden';
}

slipPreviewImage.addEventListener('load', fitSlipToStage);
slipPreviewImage.addEventListener('error', function() {
    slipPreviewImage.classList.add('hidden');
    slipPreviewError.classList.remove('hidden');
});

document.getElementById('slipZoomInButton').addEventListener('click', function() {
    changeSlipZoom(0.25);
});
document.getElementById('slipZoomOutButton').addEventListener('click', function() {
    changeSlipZoom(-0.25);
});
document.getElementById('slipZoomResetButton').addEventListener('click', fitSlipToStage);
slipPreviewStage.addEventListener('wheel', function(event) {
    if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        changeSlipZoom(event.deltaY < 0 ? 0.1 : -0.1);
    }
}, { passive: false });
window.addEventListener('resize', function() {
    if (!slipPreviewModal.classList.contains('hidden') && slipPreviewImage.naturalWidth) {
        fitSlipToStage();
    }
});

document.getElementById('closeSlipPreviewButton').addEventListener('click', closeSlipPreview);
slipPreviewModal.addEventListener('click', function(event) {
    if (event.target.matches('[data-close-slip-preview]')) {
        closeSlipPreview();
    }
});
detailContent.addEventListener('click', function(event) {
    const button = event.target.closest('.slip-preview-button');
    if (button) {
        openSlipPreview(
            button.dataset.slipUrl,
            activeRegistration && activeRegistration.id,
            activeRegistration && activeRegistration.payment_status
        );
    }
});

slipReviewForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    if (!activeSlipRegistrationId) {
        showStatus(slipReviewMessage, 'ไม่พบรหัสใบสมัคร กรุณาปิดแล้วเปิดสลิปใหม่', true);
        return;
    }

    const registrationId = activeSlipRegistrationId;
    saveSlipStatusButton.disabled = true;
    saveSlipStatusButton.textContent = 'กำลังบันทึก...';
    clearStatus(slipReviewMessage);
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData.user) {
            throw authError || new Error('ไม่พบข้อมูลบัญชีผู้ดูแล กรุณาเข้าสู่ระบบใหม่');
        }

        const { error } = await supabaseClient
            .from('registrations')
            .update({
                payment_status: slipPaymentStatus.value,
                reviewed_at: new Date().toISOString(),
                reviewed_by: authData.user.id
            })
            .eq('id', registrationId)
            .select('id')
            .single();
        if (error) {
            throw error;
        }

        if (activeRegistration && activeRegistration.id === registrationId) {
            activeRegistration.payment_status = slipPaymentStatus.value;
            reviewStatus.value = slipPaymentStatus.value;
        }
        if (activeSlipRegistrationId === registrationId) {
            showStatus(slipReviewMessage, 'บันทึกสถานะชำระเงินแล้ว', false);
        }
        await loadRegistrations();
        if (activeRegistration && activeRegistration.id === registrationId) {
            await loadAuditHistory(registrationId);
        }
    } catch (error) {
        if (activeSlipRegistrationId === registrationId) {
            showStatus(slipReviewMessage, 'บันทึกสถานะไม่สำเร็จ: ' + error.message, true);
        }
    } finally {
        if (activeSlipRegistrationId === registrationId) {
            saveSlipStatusButton.disabled = false;
            saveSlipStatusButton.textContent = 'บันทึกสถานะ';
        }
    }
});

async function closeDetailModal() {
    if (!slipPreviewModal.classList.contains('hidden')) {
        closeSlipPreview();
    }
    detailModal.classList.add('hidden');
    document.body.style.overflow = '';
    activeRegistration = null;
}

document.getElementById('closeDetailButton').addEventListener('click', closeDetailModal);
document.getElementById('cancelReviewButton').addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', function(event) {
    if (event.target.matches('[data-close-modal]')) {
        closeDetailModal();
    }
});
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && !slipPreviewModal.classList.contains('hidden')) {
        closeSlipPreview();
    } else if (!slipPreviewModal.classList.contains('hidden')
        && !/^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) {
        if (event.key === '+' || event.key === '=') {
            changeSlipZoom(0.25);
        } else if (event.key === '-') {
            changeSlipZoom(-0.25);
        } else if (event.key === '0') {
            fitSlipToStage();
        }
    } else if (event.key === 'Escape' && !detailModal.classList.contains('hidden')) {
        closeDetailModal();
    }
});

reviewForm.addEventListener('submit', async function(event) {
    event.preventDefault();
    if (!activeRegistration) {
        return;
    }

    saveReviewButton.disabled = true;
    saveReviewButton.textContent = 'กำลังบันทึก...';
    clearStatus(reviewStatusMessage);
    try {
        const { data: authData, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !authData.user) {
            throw authError || new Error('ไม่พบข้อมูลบัญชีผู้ดูแล กรุณาเข้าสู่ระบบใหม่');
        }

        const { error } = await supabaseClient
            .from('registrations')
            .update({
                payment_status: reviewStatus.value,
                admin_note: adminNote.value.trim(),
                reviewed_at: new Date().toISOString(),
                reviewed_by: authData.user.id
            })
            .eq('id', activeRegistration.id);
        if (error) {
            throw error;
        }

        showStatus(reviewStatusMessage, 'บันทึกผลตรวจสอบแล้ว', false);
        await loadAuditHistory(activeRegistration.id);
        await loadRegistrations();
        activeRegistration.payment_status = reviewStatus.value;
        activeRegistration.admin_note = adminNote.value.trim();
    } catch (error) {
        showStatus(reviewStatusMessage, 'บันทึกผลตรวจสอบไม่สำเร็จ: ' + error.message, true);
    } finally {
        saveReviewButton.disabled = false;
        saveReviewButton.textContent = 'บันทึกผลตรวจสอบ';
    }
});

if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(function(event, session) {
        const isAuthenticated = Boolean(session);
        setAuthenticatedView(isAuthenticated);
        if (isAuthenticated) {
            window.setTimeout(function() {
                loadRegistrationDeadline();
                loadRegistrations();
            }, 0);
        } else {
            currentRequest += 1;
            clearStatus(dashboardStatus);
            registrationRows.innerHTML = '';
            slipPreviewModal.classList.add('hidden');
            slipPreviewImage.removeAttribute('src');
            slipDownloadLink.removeAttribute('href');
            slipDownloadLink.hidden = true;
            detailModal.classList.add('hidden');
            detailContent.replaceChildren();
            auditHistory.replaceChildren();
            activeRegistration = null;
            registrationDeadlineLoaded = false;
            registrationDeadlineDate.value = '';
            registrationDeadlineTime.value = '';
            registrationDeadlineDate.disabled = true;
            registrationDeadlineTime.disabled = true;
            currentRegistrationDeadline.textContent = 'กำลังโหลด...';
            saveRegistrationDeadlineButton.disabled = true;
            clearStatus(deadlineSettingsStatus);
            document.body.style.overflow = '';
        }
    });
} else {
    showStatus(loginError, 'โหลดไลบรารี Supabase ไม่สำเร็จ กรุณารีโหลดหน้าเว็บ', true);
}
