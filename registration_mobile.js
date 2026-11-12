const SUPABASE_URL = 'https://wiomaiuhbekbfsjlemqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indpb21haXVoYmVrYmZzamxlbXFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0ODQ0MjYsImV4cCI6MjExMDA2MDQyNn0.54Tft_ee1yAXSOhYOg2BmzYBHfFMJFjrLzXl0KUHiZ8';
function createUuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
    }

    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการสร้างรหัสใบสมัครที่ปลอดภัย');
    }

    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0F) | 0x40;
    bytes[8] = (bytes[8] & 0x3F) | 0x80;
    const hex = Array.from(bytes, function(byte) {
        return byte.toString(16).padStart(2, '0');
    }).join('');

    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16)
        + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
}

const ageGroupData = {
    '3v3': [
        { value: 'u8_3v3', text: 'รุ่นอายุไม่เกิน 8 ปี (600 บาท)', price: 600 },
        { value: 'u10_3v3', text: 'รุ่นอายุไม่เกิน 10 ปี (700 บาท)', price: 700 },
        { value: 'u12_3v3', text: 'รุ่นอายุไม่เกิน 12 ปี (800 บาท)', price: 800 },
        { value: '13-15_3v3', text: 'รุ่นอายุ 13-15 ปี (1,200 บาท)', price: 1200 },
        { value: '16-18_3v3', text: 'รุ่นอายุ 16-18 ปี (1,800 บาท)', price: 1800 },
        { value: '19-23_3v3', text: 'รุ่นอายุ 19-23 ปี (2,400 บาท)', price: 2400 },
        { value: 'open_3v3', text: 'รุ่นประชาชนทั่วไป (3,200 บาท)', price: 3200 }
    ],
    '1v1': [
        { value: '8-10_1v1', text: 'รุ่นอายุ 8-10 ปี (40 บาท)', price: 40 },
        { value: 'u12_1v1', text: 'รุ่นอายุไม่เกิน 12 ปี (50 บาท)', price: 50 },
        { value: '13-15_1v1', text: 'รุ่นอายุ 13-15 ปี (60 บาท)', price: 60 },
        { value: '16-18_1v1', text: 'รุ่นอายุ 16-18 ปี (80 บาท)', price: 80 },
        { value: '19-23_1v1', text: 'รุ่นอายุ 19-23 ปี (100 บาท)', price: 100 },
        { value: 'open_1v1', text: 'รุ่นประชาชนทั่วไป (200 บาท)', price: 200 }
    ],
    crossbar: [
        { value: '8-12_cb', text: 'รุ่นอายุ 8-12 ปี (40 บาท)', price: 40 },
        { value: '13-15_cb', text: 'รุ่นอายุ 13-15 ปี (60 บาท)', price: 60 },
        { value: '16-18_cb', text: 'รุ่นอายุ 16-18 ปี (80 บาท)', price: 80 },
        { value: '19-23_cb', text: 'รุ่นอายุ 19-23 ปี (100 บาท)', price: 100 },
        { value: 'open_cb', text: 'รุ่นประชาชนทั่วไป (200 บาท)', price: 200 }
    ]
};

function createPromptPayPayload(amount) {
    function field(id, value) {
        return id + String(value.length).padStart(2, '0') + value;
    }

    const mobileNumber = '0621934749';
    const promptPayAccount = field('00', 'A000000677010111')
        + field('01', '0066' + mobileNumber.slice(1));
    const merchantAccount = field('29', promptPayAccount);
    const payload = field('00', '01')
        + field('01', '12')
        + merchantAccount
        + field('53', '764')
        + field('54', amount.toFixed(2))
        + field('58', 'TH')
        + '6304';

    let crc = 0xFFFF;
    for (let index = 0; index < payload.length; index += 1) {
        crc ^= payload.charCodeAt(index) << 8;
        for (let bit = 0; bit < 8; bit += 1) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
            crc &= 0xFFFF;
        }
    }

    return payload + crc.toString(16).toUpperCase().padStart(4, '0');
}

document.addEventListener('DOMContentLoaded', function() {
    const activitySelect = document.getElementById('activityType');
    const ageGroupSelect = document.getElementById('ageGroup');
    const form = document.getElementById('registrationForm');
    const phoneInput = document.getElementById('phone');
    const teamRosterSection = document.getElementById('teamRosterSection');
    const teamMemberInputs = Array.from(form.querySelectorAll('[name="teamMembers"]'));
    const teamMemberPhoneInputs = Array.from(form.querySelectorAll('[name="teamMemberPhones"]'));
    const rosterProgress = document.getElementById('rosterProgress');
    ageGroupSelect.closest('.form-grid').insertAdjacentElement('afterend', teamRosterSection);
    const modal = document.getElementById('successModal');
    const body = document.body;
    const slipUpload = document.getElementById('slipUpload');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const promptPayPayment = document.getElementById('promptPayPayment');
    const promptPayAmount = document.getElementById('promptPayAmount');
    const promptPayQrCode = document.getElementById('promptPayQrCode');
    const promptPayQrError = document.getElementById('promptPayQrError');
    const formStatus = document.getElementById('formStatus');
    const submitButton = document.getElementById('submitButton');
    const registrationClosedNotice = document.getElementById('registrationClosedNotice');
    const registrationDeadlineLabel = document.getElementById('registrationDeadlineLabel');
    const reviewModal = document.getElementById('reviewModal');
    const reviewSummary = document.getElementById('reviewSummary');
    const reviewTeamSection = document.getElementById('reviewTeamSection');
    const reviewTeamMembers = document.getElementById('reviewTeamMembers');
    const reviewSlipName = document.getElementById('reviewSlipName');
    const confirmRegistrationButton = document.getElementById('confirmRegistrationButton');
    const successRegistrationId = document.getElementById('successRegistrationId');
    const successRegistrationSummary = document.getElementById('successRegistrationSummary');
    const successRegistrationImage = document.getElementById('successRegistrationImage');
    const successImageStatus = document.getElementById('successImageStatus');
    const downloadRegistrationImage = document.getElementById('downloadRegistrationImage');
    // Exclusive cutoff at midnight after 18 Dec 2569 in Asia/Bangkok.
    let registrationDeadline = null;
    let registrationDeadlineLoaded = false;
    let registrationDeadlineFailed = false;
    let registrationDeadlineTimer = null;
    let pendingSubmission = null;
    let registrationImageUrl = null;
    const supabaseClient = window.supabase && window.supabase.createClient
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
                storageKey: 'registration-form-auth'
            }
        })
        : null;

    function isRegistrationOpen() {
        return registrationDeadlineLoaded
            && registrationDeadline
            && Date.now() < registrationDeadline.getTime();
    }

    function updateRegistrationAvailability() {
        const isOpen = isRegistrationOpen();
        const isLocked = !isOpen;
        registrationClosedNotice.classList.toggle('hidden', isOpen || !registrationDeadlineLoaded && !registrationDeadlineFailed);
        if (registrationDeadlineFailed) {
            registrationClosedNotice.textContent = 'ไม่สามารถตรวจสอบกำหนดปิดรับสมัครได้ กรุณาลองใหม่ภายหลัง';
        } else {
            registrationClosedNotice.textContent = 'ปิดรับสมัครแล้ว ขอขอบคุณที่ให้ความสนใจการแข่งขัน';
        }
        form.querySelectorAll('input, select').forEach(function(input) {
            input.disabled = isLocked;
        });
        activitySelect.disabled = isLocked;
        ageGroupSelect.disabled = isLocked || !activitySelect.value;
        slipUpload.disabled = isLocked;
        teamMemberInputs.forEach(function(input) {
            input.disabled = isLocked || activitySelect.value !== '3v3' || !ageGroupSelect.value;
        });
        teamMemberPhoneInputs.forEach(function(input) {
            input.disabled = isLocked || activitySelect.value !== '3v3' || !ageGroupSelect.value;
        });
        submitButton.disabled = isLocked;
        if (!registrationDeadlineLoaded) {
            submitButton.textContent = registrationDeadlineFailed
                ? 'ตรวจสอบกำหนดปิดรับไม่ได้'
                : 'กำลังโหลดกำหนดปิดรับสมัคร...';
        } else if (!isOpen) {
            submitButton.textContent = 'ปิดรับสมัครแล้ว';
        } else {
            submitButton.textContent = 'ตรวจสอบข้อมูลก่อนส่ง';
        }
    }

    function scheduleRegistrationDeadline() {
        window.clearTimeout(registrationDeadlineTimer);
        if (registrationDeadline && registrationDeadline.getTime() > Date.now()) {
            registrationDeadlineTimer = window.setTimeout(
                updateRegistrationAvailability,
                Math.min(registrationDeadline.getTime() - Date.now() + 1, 2147483647)
            );
        }
    }

    async function refreshRegistrationDeadline() {
        if (!supabaseClient) {
            throw new Error('เชื่อมต่อระบบกำหนดเวลาปิดรับสมัครไม่ได้');
        }
        const { data, error } = await supabaseClient
            .from('registration_settings')
            .select('deadline_at')
            .eq('id', 1)
            .single();
        if (error) {
            throw error;
        }
        const parsedDeadline = new Date(data && data.deadline_at);
        if (!data || !Number.isFinite(parsedDeadline.getTime())) {
            throw new Error('ไม่พบกำหนดปิดรับสมัครที่ถูกต้อง');
        }

        registrationDeadline = parsedDeadline;
        registrationDeadlineLoaded = true;
        registrationDeadlineFailed = false;
        registrationDeadlineLabel.textContent = 'ปิดรับ '
            + new Intl.DateTimeFormat('th-TH', {
                dateStyle: 'long',
                timeStyle: 'short',
                timeZone: 'Asia/Bangkok'
            }).format(registrationDeadline) + ' น.';
        updateRegistrationAvailability();
        scheduleRegistrationDeadline();
    }

    function handleRegistrationDeadlineError(error) {
        console.error('Unable to load registration deadline:', error);
        registrationDeadline = null;
        registrationDeadlineLoaded = false;
        registrationDeadlineFailed = true;
        registrationDeadlineLabel.textContent = 'ไม่สามารถโหลดกำหนดปิดรับสมัครได้';
        updateRegistrationAvailability();
    }

    function addReviewItem(label, value, fullWidth) {
        const item = document.createElement('div');
        item.className = 'review-summary-item' + (fullWidth ? ' review-summary-item-full' : '');
        const itemLabel = document.createElement('span');
        itemLabel.textContent = label;
        const itemValue = document.createElement('strong');
        itemValue.textContent = value;
        item.append(itemLabel, itemValue);
        reviewSummary.appendChild(item);
    }

    function normalizePhoneNumber(value) {
        return value.replace(/\D/g, '');
    }

    async function getFunctionErrorMessage(error) {
        const response = error && error.context;
        if (response && typeof response.clone === 'function') {
            try {
                const body = await response.clone().json();
                if (body && typeof body.error === 'string') {
                    return body.error;
                }
            } catch (parseError) {
                console.error('Unable to read registration error response:', parseError);
            }
        }
        return error.message || 'ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
    }

    function formatPhoneNumber(value) {
        const digits = normalizePhoneNumber(value).slice(0, 10);
        if (digits.length === 9 && digits.startsWith('02')) {
            return digits.slice(0, 2) + '-' + digits.slice(2, 5) + '-' + digits.slice(5);
        }
        if (digits.length <= 3) {
            return digits;
        }
        if (digits.length <= 6) {
            return digits.slice(0, 3) + '-' + digits.slice(3);
        }
        return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
    }

    phoneInput.addEventListener('input', function() {
        const selectionStart = phoneInput.selectionStart || 0;
        const digitsBeforeCaret = normalizePhoneNumber(phoneInput.value.slice(0, selectionStart)).length;
        const formattedValue = formatPhoneNumber(phoneInput.value);
        phoneInput.value = formattedValue;

        let caretPosition = 0;
        let digitsCounted = 0;
        while (caretPosition < formattedValue.length && digitsCounted < digitsBeforeCaret) {
            if (/\d/.test(formattedValue[caretPosition])) {
                digitsCounted += 1;
            }
            caretPosition += 1;
        }
        phoneInput.setSelectionRange(caretPosition, caretPosition);
    });

    function renderReview(data) {
        reviewSummary.replaceChildren();
        addReviewItem('ทีม / ผู้สมัคร', data.teamName, true);
        addReviewItem('ชื่อผู้ติดต่อ', data.contactName);
        addReviewItem('เบอร์โทรศัพท์', formatPhoneNumber(data.phone));
        addReviewItem('LINE ID', data.lineId);
        addReviewItem('ประเภทการแข่งขัน', data.activityLabel);
        addReviewItem('รุ่นอายุ', data.ageLabel);
        addReviewItem('ค่าสมัคร', data.amount.toLocaleString('th-TH') + ' บาท');

        reviewTeamMembers.replaceChildren();
        reviewTeamSection.classList.toggle('hidden', !data.teamMembers.length);
        data.teamMembers.forEach(function(name, index) {
            const item = document.createElement('li');
            const number = document.createElement('span');
            number.className = 'review-team-number';
            number.textContent = String(index + 1).padStart(2, '0');
            const info = document.createElement('span');
            info.className = 'review-team-member-info';
            const memberName = document.createElement('strong');
            memberName.textContent = name;
            const phone = document.createElement('span');
            phone.textContent = data.teamMemberPhones[index] || 'ไม่ระบุเบอร์โทร';
            info.append(memberName, phone);
            item.append(number, info);
            reviewTeamMembers.appendChild(item);
        });
        reviewSlipName.textContent = 'ไฟล์สลิป: ' + data.file.name;
    }

    function wrapCanvasText(context, value, maxWidth) {
        const words = String(value).split(/\s+/);
        const lines = [];
        let line = '';

        words.forEach(function(word) {
            const candidate = line ? line + ' ' + word : word;
            if (context.measureText(candidate).width <= maxWidth) {
                line = candidate;
                return;
            }
            if (line) {
                lines.push(line);
                line = '';
            }
            if (context.measureText(word).width <= maxWidth) {
                line = word;
                return;
            }

            const segments = typeof Intl.Segmenter === 'function'
                ? Array.from(new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(word), function(item) {
                    return item.segment;
                })
                : Array.from(word);
            segments.forEach(function(segment) {
                if (line && context.measureText(line + segment).width > maxWidth) {
                    lines.push(line);
                    line = '';
                }
                line += segment;
            });
        });

        if (line) {
            lines.push(line);
        }
        return lines.length ? lines : [''];
    }

    function drawRoundedRect(context, x, y, width, height, radius) {
        const corner = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + corner, y);
        context.lineTo(x + width - corner, y);
        context.quadraticCurveTo(x + width, y, x + width, y + corner);
        context.lineTo(x + width, y + height - corner);
        context.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
        context.lineTo(x + corner, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - corner);
        context.lineTo(x, y + corner);
        context.quadraticCurveTo(x, y, x + corner, y);
        context.closePath();
    }

    async function createRegistrationImage(data) {
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const width = 1080;
        const margin = 72;
        const contentWidth = width - margin * 2;
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('เบราว์เซอร์ไม่รองรับการสร้างรูปภาพ');
        }

        context.font = '500 29px Prompt, sans-serif';
        const fieldRows = [
            [
                { label: 'ทีม / ผู้สมัคร', value: data.teamName },
                { label: 'ประเภทการแข่งขัน', value: data.activityLabel }
            ],
            [
                { label: 'รุ่นอายุ', value: data.ageLabel },
                { label: 'ค่าสมัคร', value: data.amount.toLocaleString('th-TH') + ' บาท' }
            ],
            [
                { label: 'ชื่อผู้ติดต่อ', value: data.contactName },
                { label: 'เบอร์โทรศัพท์', value: formatPhoneNumber(data.phone) }
            ],
            [
                { label: 'LINE ID', value: data.lineId },
                { label: 'วันที่สมัคร', value: new Intl.DateTimeFormat('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Bangkok'
                }).format(new Date()) }
            ]
        ];
        const gap = 20;
        const fieldWidth = (contentWidth - gap) / 2;
        const fieldHeights = fieldRows.map(function(row) {
            return Math.max.apply(null, row.map(function(field) {
                return Math.max(112, 62 + wrapCanvasText(context, field.value, fieldWidth - 44).length * 40);
            }));
        });
        const memberRows = data.teamMembers.map(function(name, index) {
            const value = name + '  ·  ' + (data.teamMemberPhones[index] || 'ไม่ระบุเบอร์โทร');
            return { index: index + 1, value: value };
        });
        let height = 446 + fieldHeights.reduce(function(total, rowHeight) {
            return total + rowHeight + 16;
        }, 0) + 145;
        if (memberRows.length) {
            height += 66 + memberRows.reduce(function(total, member) {
                context.font = '500 27px Prompt, sans-serif';
                return total + Math.max(68, 34 + wrapCanvasText(context, member.value, contentWidth - 120).length * 36) + 9;
            }, 0);
        }
        canvas.width = width;
        canvas.height = height;

        context.fillStyle = '#f2f7f3';
        context.fillRect(0, 0, width, height);
        context.fillStyle = '#ffffff';
        drawRoundedRect(context, 32, 32, width - 64, height - 64, 28);
        context.fill();
        const headerGradient = context.createLinearGradient(32, 32, width - 32, 260);
        headerGradient.addColorStop(0, '#123f2b');
        headerGradient.addColorStop(1, '#21814c');
        context.save();
        drawRoundedRect(context, 32, 32, width - 64, 240, 28);
        context.clip();
        context.fillStyle = headerGradient;
        context.fillRect(32, 32, width - 64, 240);
        context.globalAlpha = 0.08;
        context.beginPath();
        context.arc(width - 95, 55, 205, 0, Math.PI * 2);
        context.fillStyle = '#ffffff';
        context.fill();
        context.restore();

        context.fillStyle = '#d9f0df';
        context.font = '600 22px Prompt, sans-serif';
        context.fillText('ECO GREEN & HEALTH FOOTBALL CHAMPIONSHIP 2026', margin, 91);
        context.fillStyle = '#ffffff';
        context.font = '600 42px Prompt, sans-serif';
        context.fillText('ยืนยันรายละเอียดการสมัคร', margin, 158);
        context.fillStyle = '#e7f5ea';
        context.font = '400 25px Prompt, sans-serif';
        context.fillText('กรุณาเก็บภาพนี้ไว้เป็นหลักฐานอ้างอิงการสมัคร', margin, 207);

        let y = 310;
        context.fillStyle = '#17643b';
        context.font = '600 22px Prompt, sans-serif';
        context.fillText('รหัสใบสมัคร', margin, y);
        y += 18;
        context.fillStyle = '#f1f8f3';
        drawRoundedRect(context, margin, y, contentWidth, 92, 16);
        context.fill();
        context.fillStyle = '#155b34';
        context.font = '600 29px Prompt, sans-serif';
        context.fillText(data.registrationId.toUpperCase(), margin + 22, y + 57);
        y += 118;

        fieldRows.forEach(function(row, rowIndex) {
            row.forEach(function(field, columnIndex) {
                const x = margin + columnIndex * (fieldWidth + gap);
                const cardY = y;
                const cardHeight = fieldHeights[rowIndex];
                context.fillStyle = '#f8faf8';
                context.strokeStyle = '#e1ebe4';
                context.lineWidth = 2;
                drawRoundedRect(context, x, cardY, fieldWidth, cardHeight, 15);
                context.fill();
                context.stroke();
                context.fillStyle = '#718076';
                context.font = '400 21px Prompt, sans-serif';
                context.fillText(field.label, x + 20, cardY + 36);
                context.fillStyle = '#203328';
                context.font = '500 27px Prompt, sans-serif';
                wrapCanvasText(context, field.value, fieldWidth - 44).forEach(function(line, index) {
                    context.fillText(line, x + 20, cardY + 76 + index * 36);
                });
            });
            y += fieldHeights[rowIndex] + 16;
        });

        if (memberRows.length) {
            y += 12;
            context.fillStyle = '#183c29';
            context.font = '600 27px Prompt, sans-serif';
            context.fillText('รายชื่อสมาชิกทีม', margin, y + 32);
            y += 54;
            memberRows.forEach(function(member) {
                context.font = '500 27px Prompt, sans-serif';
                const lines = wrapCanvasText(context, member.value, contentWidth - 120);
                const rowHeight = Math.max(68, 34 + lines.length * 36);
                context.fillStyle = '#ffffff';
                context.strokeStyle = '#e4ece5';
                drawRoundedRect(context, margin, y, contentWidth, rowHeight, 13);
                context.fill();
                context.stroke();
                context.fillStyle = '#eaf5ec';
                drawRoundedRect(context, margin + 15, y + 17, 38, 34, 9);
                context.fill();
                context.fillStyle = '#17643b';
                context.font = '600 18px Prompt, sans-serif';
                context.fillText(String(member.index).padStart(2, '0'), margin + 21, y + 40);
                context.fillStyle = '#203328';
                context.font = '500 27px Prompt, sans-serif';
                lines.forEach(function(line, index) {
                    context.fillText(line, margin + 70, y + 43 + index * 36);
                });
                y += rowHeight + 9;
            });
        }

        const footerY = height - 90;
        context.strokeStyle = '#e5ece6';
        context.beginPath();
        context.moveTo(margin, footerY - 24);
        context.lineTo(width - margin, footerY - 24);
        context.stroke();
        context.fillStyle = '#66756a';
        context.font = '400 20px Prompt, sans-serif';
        context.fillText('สถานะ: รับใบสมัครแล้ว · รอตรวจสอบการชำระเงิน', margin, footerY + 12);
        context.fillStyle = '#17643b';
        context.font = '500 20px Prompt, sans-serif';
        context.textAlign = 'right';
        context.fillText('ขอบคุณที่สมัครเข้าร่วมการแข่งขัน', width - margin, footerY + 12);
        context.textAlign = 'left';

        return new Promise(function(resolve, reject) {
            canvas.toBlob(function(blob) {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('สร้างไฟล์รูปภาพไม่สำเร็จ'));
                }
            }, 'image/png');
        });
    }

    function prepareRegistrationImage(blob, registrationId) {
        if (registrationImageUrl) {
            URL.revokeObjectURL(registrationImageUrl);
        }
        registrationImageUrl = URL.createObjectURL(blob);
        successRegistrationImage.src = registrationImageUrl;
        downloadRegistrationImage.href = registrationImageUrl;
        downloadRegistrationImage.download = 'ECO-registration-' + registrationId + '.png';
        successImageStatus.textContent = 'รูปภาพพร้อมแล้ว หากยังไม่ดาวน์โหลดอัตโนมัติ แตะปุ่ม “ดาวน์โหลดรูปภาพ”';
        downloadRegistrationImage.click();
    }

    updateRegistrationAvailability();
    refreshRegistrationDeadline().catch(handleRegistrationDeadlineError);
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            refreshRegistrationDeadline().catch(handleRegistrationDeadlineError);
        }
    });

    function clearPromptPayQr() {
        promptPayPayment.classList.add('hidden');
        promptPayQrCode.replaceChildren();
        promptPayQrError.classList.add('hidden');
        promptPayQrError.textContent = '';
    }

    function updatePromptPayQr() {
        const selectedOption = ageGroupSelect.selectedOptions[0];
        const amount = selectedOption ? Number(selectedOption.dataset.price) : 0;
        if (!amount) {
            clearPromptPayQr();
            return;
        }

        promptPayPayment.classList.remove('hidden');
        promptPayAmount.textContent = (activitySelect.value === '3v3' ? 'ค่าสมัครต่อทีม: ' : 'ค่าสมัครต่อคน: ')
            + amount.toLocaleString('th-TH') + ' บาท';
        promptPayQrCode.replaceChildren();
        promptPayQrError.classList.add('hidden');
        promptPayQrError.textContent = '';

        if (typeof window.QRCode !== 'function') {
            promptPayQrError.textContent = 'ไม่สามารถโหลดตัวสร้าง QR Code ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
            promptPayQrError.classList.remove('hidden');
            return;
        }

        new window.QRCode(promptPayQrCode, {
            text: createPromptPayPayload(amount),
            width: 220,
            height: 220,
            colorDark: '#111827',
            colorLight: '#ffffff',
            correctLevel: window.QRCode.CorrectLevel.M
        });
    }

    function updateTeamRoster() {
        const isTeamActivity = activitySelect.value === '3v3' && Boolean(ageGroupSelect.value);
        teamRosterSection.classList.toggle('hidden', !isTeamActivity);
        teamMemberInputs.forEach(function(input) {
            input.disabled = !isTeamActivity;
            input.required = isTeamActivity;
        });
        teamMemberPhoneInputs.forEach(function(input) {
            input.disabled = !isTeamActivity;
        });
    }

    function updateRosterProgress() {
        const namesCompleted = teamMemberInputs.filter(function(input) {
            return input.value.trim().length > 0;
        }).length;
        const phonesEntered = teamMemberPhoneInputs.filter(function(input) {
            return input.value.trim().length > 0;
        }).length;
        const phonesCompleted = Math.min(phonesEntered, 3);
        rosterProgress.textContent = 'กรอกชื่อแล้ว ' + namesCompleted + '/6 คน · เบอร์โทรแล้ว '
            + phonesCompleted + '/3 คน';
        rosterProgress.classList.toggle('is-complete', namesCompleted === 6 && phonesEntered >= 3);
    }

    teamMemberInputs.concat(teamMemberPhoneInputs).forEach(function(input) {
        input.addEventListener('input', updateRosterProgress);
    });
    updateRosterProgress();

    activitySelect.addEventListener('change', function() {
        const selectedType = this.value;
        clearPromptPayQr();
        ageGroupSelect.innerHTML = '';

        if (selectedType && ageGroupData[selectedType]) {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = '-- เลือกรุ่นอายุ --';
            ageGroupSelect.appendChild(defaultOption);

            ageGroupData[selectedType].forEach(function(group) {
                const option = document.createElement('option');
                option.value = group.value;
                option.textContent = group.text;
                option.dataset.price = String(group.price);
                ageGroupSelect.appendChild(option);
            });

            ageGroupSelect.disabled = false;
            ageGroupSelect.classList.remove('bg-gray-50');
            ageGroupSelect.classList.add('bg-white');
        } else {
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.disabled = true;
            defaultOption.selected = true;
            defaultOption.textContent = '-- กรุณาเลือกประเภทการแข่งขันก่อน --';
            ageGroupSelect.appendChild(defaultOption);

            ageGroupSelect.disabled = true;
            ageGroupSelect.classList.add('bg-gray-50');
            ageGroupSelect.classList.remove('bg-white');
        }
        updateTeamRoster();
    });

    ageGroupSelect.addEventListener('change', function() {
        updateTeamRoster();
        updatePromptPayQr();
    });

    slipUpload.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            fileNameDisplay.textContent = `ไฟล์ที่เลือก: ${this.files[0].name}`;
            fileNameDisplay.classList.remove('hidden');
        } else {
            fileNameDisplay.classList.add('hidden');
        }
    });

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        try {
            await refreshRegistrationDeadline();
        } catch (error) {
            handleRegistrationDeadlineError(error);
            formStatus.textContent = 'ตรวจสอบกำหนดปิดรับสมัครไม่สำเร็จ กรุณาลองใหม่';
            formStatus.classList.remove('hidden');
            return;
        }
        if (!isRegistrationOpen()) {
            updateRegistrationAvailability();
            formStatus.textContent = 'ปิดรับสมัครแล้ว ไม่สามารถส่งใบสมัครใหม่ได้';
            formStatus.classList.remove('hidden');
            return;
        }

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        formStatus.classList.add('hidden');
        formStatus.textContent = '';

        if (!supabaseClient) {
            formStatus.textContent = 'เชื่อมต่อระบบสมัครไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
            formStatus.classList.remove('hidden');
            return;
        }

        const file = slipUpload.files[0];
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!file || !allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
            formStatus.textContent = 'กรุณาแนบไฟล์ JPG, PNG, GIF หรือ WEBP ขนาดไม่เกิน 5 MB';
            formStatus.classList.remove('hidden');
            return;
        }

        const selectedOption = ageGroupSelect.selectedOptions[0];
        const amount = selectedOption ? Number(selectedOption.dataset.price) : 0;
        if (!amount) {
            formStatus.textContent = 'กรุณาเลือกประเภทการแข่งขันและรุ่นอายุ';
            formStatus.classList.remove('hidden');
            return;
        }

        const teamMembers = activitySelect.value === '3v3'
            ? teamMemberInputs.map(function(input) { return input.value.trim(); })
            : [];
        const teamMemberPhones = activitySelect.value === '3v3'
            ? teamMemberPhoneInputs.map(function(input) { return input.value.trim(); })
            : [];
        if (activitySelect.value === '3v3' && teamMembers.some(function(name) { return !name; })) {
            formStatus.textContent = 'กรุณากรอกรายชื่อสมาชิกทีมให้ครบทั้ง 6 คน';
            formStatus.classList.remove('hidden');
            return;
        }
        const normalizedMemberNames = teamMembers.map(function(name) {
            return name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
        });
        if (activitySelect.value === '3v3'
            && new Set(normalizedMemberNames).size !== normalizedMemberNames.length) {
            formStatus.textContent = 'รายชื่อสมาชิกทีมต้องไม่ซ้ำกัน';
            formStatus.classList.remove('hidden');
            return;
        }
        if (activitySelect.value === '3v3' && teamMemberPhones.filter(Boolean).length < 3) {
            formStatus.textContent = 'กรุณากรอกเบอร์โทรศัพท์สมาชิกทีมอย่างน้อย 3 คน';
            formStatus.classList.remove('hidden');
            return;
        }
        const enteredPhones = teamMemberPhones.filter(Boolean);
        if (activitySelect.value === '3v3' && new Set(enteredPhones).size !== enteredPhones.length) {
            formStatus.textContent = 'เบอร์โทรสมาชิกทีมต้องไม่ซ้ำกัน';
            formStatus.classList.remove('hidden');
            return;
        }

        let registrationId;
        try {
            registrationId = createUuid();
        } catch (error) {
            formStatus.textContent = error.message;
            formStatus.classList.remove('hidden');
            return;
        }
        pendingSubmission = {
            registrationId: registrationId,
            file: file,
            amount: amount,
            teamName: form.elements.teamName.value.trim(),
            contactName: form.elements.contactName.value.trim(),
            phone: normalizePhoneNumber(form.elements.phone.value),
            lineId: form.elements.lineId.value.trim(),
            activityType: activitySelect.value,
            activityLabel: activitySelect.selectedOptions[0].textContent,
            ageGroup: ageGroupSelect.value,
            ageLabel: ageGroupSelect.selectedOptions[0].textContent.replace(/\s*\([^)]*บาท\)\s*$/, ''),
            teamMembers: teamMembers,
            teamMemberPhones: teamMemberPhones
        };
        renderReview(pendingSubmission);
        reviewModal.classList.remove('hidden');
        body.classList.add('modal-active');
        confirmRegistrationButton.focus();
    });

    confirmRegistrationButton.addEventListener('click', async function() {
        if (!pendingSubmission) {
            return;
        }
        try {
            await refreshRegistrationDeadline();
        } catch (error) {
            handleRegistrationDeadlineError(error);
            reviewModal.classList.add('hidden');
            body.classList.remove('modal-active');
            formStatus.textContent = 'ตรวจสอบกำหนดปิดรับสมัครไม่สำเร็จ กรุณาลองใหม่';
            formStatus.classList.remove('hidden');
            return;
        }
        if (!isRegistrationOpen()) {
            reviewModal.classList.add('hidden');
            body.classList.remove('modal-active');
            pendingSubmission = null;
            updateRegistrationAvailability();
            formStatus.textContent = 'ปิดรับสมัครแล้ว ไม่สามารถส่งใบสมัครใหม่ได้';
            formStatus.classList.remove('hidden');
            return;
        }

        const submission = pendingSubmission;
        confirmRegistrationButton.disabled = true;
        confirmRegistrationButton.textContent = 'กำลังเตรียมรูปภาพ...';
        submitButton.disabled = true;
        let registrationImageBlob;
        try {
            registrationImageBlob = await createRegistrationImage(submission);
        } catch (error) {
            console.error('Registration image creation failed:', error);
            formStatus.textContent = 'เตรียมรูปภาพใบสมัครไม่สำเร็จ กรุณาลองอีกครั้ง';
            formStatus.classList.remove('hidden');
            reviewModal.classList.add('hidden');
            body.classList.remove('modal-active');
            confirmRegistrationButton.disabled = false;
            confirmRegistrationButton.textContent = 'ยืนยันและส่งใบสมัคร';
            submitButton.disabled = !isRegistrationOpen();
            return;
        }
        confirmRegistrationButton.textContent = 'กำลังส่งใบสมัคร...';

        try {
            const registrationFormData = new FormData();
            registrationFormData.append('registrationId', submission.registrationId);
            registrationFormData.append('teamName', submission.teamName);
            registrationFormData.append('contactName', submission.contactName);
            registrationFormData.append('phone', submission.phone);
            registrationFormData.append('lineId', submission.lineId);
            registrationFormData.append('activityType', submission.activityType);
            registrationFormData.append('ageGroup', submission.ageGroup);
            registrationFormData.append('amount', String(submission.amount));
            registrationFormData.append('teamMembers', JSON.stringify(submission.teamMembers));
            registrationFormData.append('teamMemberPhones', JSON.stringify(submission.teamMemberPhones));
            registrationFormData.append('slip', submission.file, submission.file.name);

            const { data: result, error: submitError } = await supabaseClient.functions.invoke(
                'submit-registration',
                { body: registrationFormData }
            );
            if (submitError) {
                throw new Error(await getFunctionErrorMessage(submitError));
            }
            if (!result || result.registrationId !== submission.registrationId
                || result.amountThb !== submission.amount) {
                throw new Error('ระบบรับผลการสมัครไม่สมบูรณ์ กรุณาติดต่อผู้จัดงานก่อนส่งซ้ำ');
            }

            successRegistrationId.textContent = result.registrationId.toUpperCase();
            successRegistrationSummary.textContent = submission.teamName + ' · '
                + submission.activityLabel + ' · ' + submission.ageLabel + ' · '
                + result.amountThb.toLocaleString('th-TH') + ' บาท';
            reviewModal.classList.add('hidden');
            modal.classList.remove('hidden');
            try {
                prepareRegistrationImage(registrationImageBlob, result.registrationId);
            } catch (imageError) {
                console.error('Registration image display or download failed:', imageError);
                successImageStatus.textContent = 'สมัครสำเร็จแล้ว แต่ไม่สามารถเตรียมการดาวน์โหลดรูปภาพได้ กรุณาปิดหน้าต่างนี้แล้วติดต่อผู้จัดงาน';
                downloadRegistrationImage.classList.add('hidden');
            }
            pendingSubmission = null;
        } catch (error) {
            console.error('Registration submission failed:', error);
            reviewModal.classList.add('hidden');
            body.classList.remove('modal-active');
            pendingSubmission = null;
            formStatus.textContent = error.message || 'ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
            formStatus.classList.remove('hidden');
        } finally {
            confirmRegistrationButton.disabled = false;
            confirmRegistrationButton.textContent = 'ยืนยันและส่งใบสมัคร';
            submitButton.disabled = !isRegistrationOpen();
        }
    });

    document.getElementById('backToFormButton').addEventListener('click', function() {
        reviewModal.classList.add('hidden');
        body.classList.remove('modal-active');
        submitButton.focus();
    });

    reviewModal.addEventListener('click', function(event) {
        if (event.target.matches('[data-close-review]')) {
            reviewModal.classList.add('hidden');
            body.classList.remove('modal-active');
        }
    });

    document.getElementById('closeModalButton').addEventListener('click', function() {
        modal.classList.add('hidden');
        body.classList.remove('modal-active');
        if (registrationImageUrl) {
            URL.revokeObjectURL(registrationImageUrl);
            registrationImageUrl = null;
        }
        successRegistrationImage.removeAttribute('src');
        downloadRegistrationImage.removeAttribute('href');
        downloadRegistrationImage.classList.remove('hidden');
        form.reset();
        formStatus.classList.add('hidden');
        formStatus.textContent = '';

        ageGroupSelect.innerHTML = '<option value="" disabled selected>-- กรุณาเลือกประเภทการแข่งขันก่อน --</option>';
        ageGroupSelect.disabled = true;
        ageGroupSelect.classList.add('bg-gray-50');
        ageGroupSelect.classList.remove('bg-white');
        updateTeamRoster();
        updateRosterProgress();
        fileNameDisplay.classList.add('hidden');
        clearPromptPayQr();
        updateRegistrationAvailability();
    });
});
