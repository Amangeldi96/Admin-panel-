import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDoc, 
    doc, 
    updateDoc, 
    deleteDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBenpNQgGHz8hW9nfFVxXqdbTva4b_oiUI",
    authDomain: "reklamakg-73685.firebaseapp.com",
    projectId: "reklamakg-73685",
    storageBucket: "reklamakg-73685.firebasestorage.app",
    messagingSenderId: "216572372046",
    appId: "1:216572372046:web:62381531deb0931b460f1f",
    measurementId: "G-S6H71Z1CR3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const container = document.getElementById("ads-container");
const badge = document.getElementById("counter-badge");

let activeTab = 'vip'; // Дефолт катары VIP жарнамалар көрсөтүлөт
let allPendingRequests = []; // Күтүүдөгү сурамдар
let allActiveAds = [];       // Активдүү жарнамалар

// ImgBB же башка сүрөт шилтемелерин оңдоо
function fixImageUrl(url) {
    if (!url || typeof url !== 'string') return "";
    let cleanUrl = url.trim();
    if (cleanUrl.includes("ibb.co/") && !cleanUrl.includes("i.ibb.co/")) {
        cleanUrl = cleanUrl.replace("ibb.co/", "i.ibb.co/") + ".jpg";
    }
    return cleanUrl;
}

// Модалканы башкаруу
window.openImageModal = function(url) {
    if (!url) return;
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImageElement");
    
    if (modal && modalImg) {
        modalImg.src = url;
        modal.classList.add("active");
        modal.style.display = "flex";
    } else {
        window.open(url, "_blank");
    }
};

window.closeImageModal = function() {
    const modal = document.getElementById("imageModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
    }
};

// 1. БАРДЫК ЖАРНАМАЛАРДЫ ЖАНА СУРАМДАРДЫ АЛУУ (Realtime listeners)
function listenToAllData() {
    if (!container) return;

    // A) VIP Сурамдарды алуу (vip_requests)
    onSnapshot(collection(db, "vip_requests"), (snapshot) => {
        allPendingRequests = [];
        snapshot.forEach((docSnap) => {
            allPendingRequests.push({
                docId: docSnap.id,
                sourceCol: "vip_requests",
                ...docSnap.data()
            });
        });
        renderCurrentTab();
    }, (err) => console.error("vip_requests катасы:", err));

    // B) Негизги жарнамаларды алуу (ads коллекциясы)
    onSnapshot(collection(db, "ads"), (snapshot) => {
        allActiveAds = [];
        snapshot.forEach((docSnap) => {
            allActiveAds.push({
                docId: docSnap.id,
                sourceCol: "ads",
                ...docSnap.data()
            });
        });
        renderCurrentTab();
    }, (err) => console.error("ads катасы:", err));
}

// 2. ГОРИЗОНТАЛЬНЫЙ МЕНЮ АРКЫЛУУ КӨРСӨТҮҮ (Render)
function renderCurrentTab() {
    if (!container) return;

    let html = "";
    let count = 0;

    if (activeTab === 'vip') {
        const pendingVip = allPendingRequests.filter(req => req.status === "pending" || req.status === "pending_approval");
        const activeVip = allActiveAds.filter(ad => ad.isVip === true || ad.type === "vip");

        count = pendingVip.length + activeVip.length;

        // Күтүүдөгү VIP сурамдар
        pendingVip.forEach(req => {
            const docId = req.docId;
            const sourceCol = req.sourceCol;
            const rawReceipt = req.receiptUrl || req.paymentReceiptImage || req.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            
            let rawAdImg = Array.isArray(req.images) && req.images.length > 0 ? req.images[0] : (req.images || req.image || "");
            const adImage = fixImageUrl(rawAdImg);
            const days = req.requestedDays || req.vipDays || 0;
            const price = req.totalPrice || req.vipTotalCost || 0;
            const adId = req.adId || docId;

            html += `
                <div class="bento-card bento-ad-item" id="card-${docId}" style="border: 1.5px solid #a855f7;">
                    <div style="font-size:11px; font-weight:700; color:#a855f7; margin-bottom:8px;">⏳ ЫРАСТООНУ КҮТҮҮДӨ (VIP)</div>
                    <div class="media-preview-cluster" style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${adImage ? `
                            <div class="media-thumb" onclick="openImageModal('${adImage}')" style="cursor:pointer;">
                                <img src="${adImage}" alt="Ad" onError="this.onerror=null; this.src='https://via.placeholder.com/150?text=Сүрөт+ката';" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
                            </div>
                        ` : ''}

                        ${receiptImage ? `
                            <div class="media-thumb" style="cursor:pointer; position:relative;">
                                <img src="${receiptImage}" alt="Чек" onclick="openImageModal('${receiptImage}')" style="width:70px; height:70px; object-fit:cover; border-radius:8px; border:1px solid #a855f7;">
                            </div>
                        ` : '<div style="font-size:11px; color:#ef4444;">Чек жок</div>'}
                    </div>

                    <div class="ad-details-stack" style="margin-top:10px;">
                        <span style="font-size: 14px; font-weight: 700;">${req.adTitle || req.title || 'VIP Жарнама ID: ' + docId}</span>
                        <div class="ad-meta-tags" style="display:flex; flex-direction:column; gap:4px; font-size:12px; margin-top:6px;">
                            <span>Email: <strong>${req.userEmail || req.email || 'Көрсөтүлгөн эмес'}</strong></span>
                            <span>Мөөнөтү: <strong class="dynamic-text">${days} күн</strong></span>
                            <span>Баасы: <strong class="dynamic-text">${price} сом</strong></span>
                        </div>
                    </div>

                    <div class="bento-actions" style="margin-top:12px; display:flex; gap:10px;">
                        <button class="bento-btn btn-yes" onclick="approveAd('${docId}', '${adId}', ${days}, '${sourceCol}')" title="Ырастоо">
                            <i class="fa-solid fa-check"></i> Ырастоо
                        </button>
                        <button class="bento-btn btn-no" onclick="rejectAd('${docId}', '${sourceCol}')" title="Четке кагуу">
                            <i class="fa-solid fa-xmark"></i> Четке кагуу
                        </button>
                    </div>
                </div>
            `;
        });

        // Активдүү VIP Жарнамалар
        activeVip.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="bento-card bento-ad-item" id="card-${ad.docId}">
                    <div style="font-size:11px; font-weight:700; color:#eab308; margin-bottom:8px;">👑 АКТИВДҮҮ VIP</div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${adImg ? `<img src="${adImg}" onclick="openImageModal('${adImg}')" style="width:60px; height:60px; object-fit:cover; border-radius:10px; cursor:pointer;">` : ''}
                        <div>
                            <h4 style="font-size:14px; margin-bottom:4px;">${ad.title || 'VIP Жарнама'}</h4>
                            <p style="font-size:12px; opacity:0.8;">${ad.price ? ad.price + ' сом' : 'Баасы жок'}</p>
                        </div>
                    </div>
                    <div style="margin-top:12px; display:flex; justify-content:flex-end;">
                        <button class="bento-btn btn-no" onclick="deleteAd('${ad.docId}', 'ads')" style="font-size:12px; padding:6px 12px;">
                            <i class="fa-solid fa-trash-can"></i> Өчүрүү
                        </button>
                    </div>
                </div>
            `;
        });

    } else {
        // Жөнөкөй (Normal) Табында
        const normalAds = allActiveAds.filter(ad => !ad.isVip && ad.type !== "vip");
        count = normalAds.length;

        normalAds.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="bento-card bento-ad-item" id="card-${ad.docId}">
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${adImg ? `<img src="${adImg}" onclick="openImageModal('${adImg}')" style="width:60px; height:60px; object-fit:cover; border-radius:10px; cursor:pointer;">` : ''}
                        <div>
                            <h4 style="font-size:14px; margin-bottom:4px;">${ad.title || 'Жөнөкөй Жарнама'}</h4>
                            <p style="font-size:12px; opacity:0.8;">${ad.price ? ad.price + ' сом' : 'Баасы жок'}</p>
                        </div>
                    </div>
                    <div style="margin-top:12px; display:flex; justify-content:flex-end;">
                        <button class="bento-btn btn-no" onclick="deleteAd('${ad.docId}', 'ads')" style="font-size:12px; padding:6px 12px;">
                            <i class="fa-solid fa-trash-can"></i> Өчүрүү
                        </button>
                    </div>
                </div>
            `;
        });
    }

    if (badge) badge.innerText = `${count}`;

    if (count === 0) {
        container.innerHTML = `
            <div class="bento-card bento-empty">
                <i class="fa-regular fa-circle-check"></i>
                <p>Бул бөлүмдө жарнамалар жок.</p>
            </div>`;
    } else {
        container.innerHTML = html;
    }

    updateThemeColors(currentProgress);
}

// 3. ТАБДЫ КӨТӨРҮҮ ФУНКЦИЯСЫ
window.switchCategory = function(category) {
    activeTab = category;
    const tabVip = document.getElementById('tab-vip');
    const tabNormal = document.getElementById('tab-normal');

    if (tabVip) tabVip.classList.toggle('active', category === 'vip');
    if (tabNormal) tabNormal.classList.toggle('active', category === 'normal');

    renderCurrentTab();
};

// 4. VIP ЖАРНАМАНЫ ЫРАСТОО
window.approveAd = async function(requestId, adId, extraDays, sourceCol) {
    try {
        const nowMs = Date.now();
        const addedMs = Number(extraDays || 0) * 24 * 60 * 60 * 1000;
        const targetAdId = (adId && adId !== 'undefined') ? adId : requestId;

        const adRef = doc(db, "ads", targetAdId);
        const adSnap = await getDoc(adRef);

        let finalExpiresAt = nowMs + addedMs;

        if (adSnap.exists()) {
            const currentData = adSnap.data();
            let currentExpireMs = 0;

            if (currentData.expiresAt?.toMillis) {
                currentExpireMs = currentData.expiresAt.toMillis();
            } else if (typeof currentData.expiresAt === 'number') {
                currentExpireMs = currentData.expiresAt;
            }

            const baseTime = currentExpireMs > nowMs ? currentExpireMs : nowMs;
            finalExpiresAt = baseTime + addedMs;
        }

        await updateDoc(adRef, { 
            isVip: true,
            type: "vip",
            expiresAt: finalExpiresAt,
            status: "active",
            updatedAt: nowMs
        });

        if (sourceCol === "vip_requests") {
            const reqRef = doc(db, "vip_requests", requestId);
            await updateDoc(reqRef, { status: "approved" });
        }
        
        removeCardAnimation(requestId);
    } catch (e) {
        console.error("Ырастоодо ката:", e);
        alert("Ырастоодо ката кетти: " + e.message);
    }
};

// 5. ЖАРНАМАНЫ ЖАНА СУРАМДАРДЫ ӨЧҮРҮҮ
window.rejectAd = async function(requestId, sourceCol) {
    if (confirm("Бул VIP сурамды четке кагууну каалайсызбы?")) {
        try {
            await deleteDoc(doc(db, sourceCol || "vip_requests", requestId));
            removeCardAnimation(requestId);
        } catch (e) {
            alert("Ката кетти: " + e.message);
        }
    }
};

window.deleteAd = async function(docId, colName) {
    if (confirm("Чын эле бул жарнаманы өчүргүңүз келеби?")) {
        try {
            await deleteDoc(doc(db, colName || "ads", docId));
            removeCardAnimation(docId);
        } catch (e) {
            alert("Өчүрүүдө ката чыкты: " + e.message);
        }
    }
};

function removeCardAnimation(requestId) {
    const card = document.getElementById(`card-${requestId}`);
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.transform = 'scale(0.95)';
        card.style.opacity = '0';
        setTimeout(() => {
            card.remove();
        }, 300);
    }
}

listenToAllData();

// --- ТҮНКҮ/КҮНДҮЗГҮ РЕЖИМ (THEME SWITCHER) ---
const body = document.body;
const toggle = document.getElementById('toggle');
const knob = document.getElementById('knob');
const icon = document.getElementById('icon');
const lightText = document.getElementById('mode-light');
const darkText = document.getElementById('mode-dark');

let isDragging = false;
let startX = 0;
let currentX = 5;
const minX = 5;
let maxX = 45;
let isDark = false;
let currentProgress = 0;

function calculateMaxX() {
    if (toggle && knob) {
        maxX = toggle.clientWidth - knob.clientWidth - 5;
    }
}
calculateMaxX();

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 0, g: 0, b: 0 };
}

const lightBgRgb = hexToRgb('#e5e5e5');
const darkBgRgb = hexToRgb('#161618');

function updateThemeColors(progress) {
    currentProgress = progress;
    const bgR = Math.round(lightBgRgb.r + (darkBgRgb.r - lightBgRgb.r) * progress);
    const bgG = Math.round(lightBgRgb.g + (darkBgRgb.g - lightBgRgb.g) * progress);
    const bgB = Math.round(lightBgRgb.b + (darkBgRgb.b - lightBgRgb.b) * progress);
    body.style.backgroundColor = `rgb(${bgR}, ${bgG}, ${bgB})`;

    const glassR = Math.round(255 + (30 - 255) * progress);
    const glassG = Math.round(255 + (30 - 255) * progress);
    const glassB = Math.round(255 + (30 - 255) * progress);
    const alphaTop = 0.7 - 0.4 * progress;
    const alphaBot = 0.3 - 0.2 * progress;

    const cardBg = `linear-gradient(135deg, rgba(${glassR}, ${glassG}, ${glassB}, ${alphaTop}), rgba(${glassR}, ${glassG}, ${glassB}, ${alphaBot}))`;
    const cardBorder = `1.5px solid rgba(${255 - progress * 200}, ${255 - progress * 200}, ${255 - progress * 200}, ${0.8 - progress * 0.7})`;
    const cardShadow = `0 10px 25px rgba(0, 0, 0, ${0.06 + progress * 0.2}), inset 0 2px 4px rgba(255, 255, 255, ${0.8 - progress * 0.7})`;

    document.querySelectorAll('.bento-card').forEach(el => {
        el.style.background = cardBg;
        el.style.borderColor = cardBorder;
        el.style.boxShadow = cardShadow;
    });

    const textR = Math.round(36 + (220 - 36) * progress);
    const textG = Math.round(41 + (225 - 41) * progress);
    const textB = Math.round(47 + (235 - 47) * progress);
    const mainTextCol = `rgb(${textR}, ${textG}, ${textB})`;

    document.querySelectorAll('.brand-info h1, .ad-meta-tags, .ad-meta-tags strong, .brand-info p, .stat-pill span').forEach(el => {
        if (!el.classList.contains('dynamic-text') && (!el.style.color || !el.style.color.includes('a855f7'))) {
            el.style.color = mainTextCol;
        }
    });

    if (toggle && knob) {
        const toggleR = Math.round(240 + (35 - 240) * progress);
        const toggleG = Math.round(240 + (35 - 240) * progress);
        const toggleB = Math.round(240 + (35 - 240) * progress);
        toggle.style.background = `linear-gradient(135deg, rgba(${toggleR}, ${toggleG}, ${toggleB}, ${0.7 - 0.2 * progress}), rgba(${toggleR - 20}, ${toggleG - 20}, ${toggleB - 20}, ${0.5 + 0.1 * progress}))`;

        const knobR = Math.round(255 + (50 - 255) * progress);
        const knobG = Math.round(255 + (50 - 255) * progress);
        const knobB = Math.round(255 + (50 - 255) * progress);
        knob.style.background = `linear-gradient(135deg, rgba(${knobR}, ${knobG}, ${knobB}, 0.95), rgba(${knobR - 35}, ${knobG - 35}, ${knobB - 35}, 0.85))`;
    }
}

function updatePositions(pos, animate = false) {
    if (!toggle || !knob) return;

    if (animate) {
        knob.style.transition = 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        body.style.transition = 'background-color 0.3s ease-out';
    } else {
        knob.style.transition = 'none';
        body.style.transition = 'none';
    }

    knob.style.left = pos + 'px';
    let progress = (pos - minX) / (maxX - minX || 1);
    progress = Math.max(0, Math.min(1, progress));
    updateThemeColors(progress);

    if (icon) {
        if (progress > 0.5) {
            if (icon.textContent !== '🌙') {
                icon.style.transform = 'scale(0) rotate(180deg)';
                setTimeout(() => {
                    icon.textContent = '🌙';
                    icon.style.transform = 'scale(1) rotate(360deg)';
                }, 150);
            }
        } else {
            if (icon.textContent !== '☀️') {
                icon.style.transform = 'scale(0) rotate(-180deg)';
                setTimeout(() => {
                    icon.textContent = '☀️';
                    icon.style.transform = 'scale(1) rotate(0deg)';
                }, 150);
            }
        }
    }

    let textOffset = progress * 100;
    if (lightText) {
        lightText.style.transform = `translateX(${textOffset}px)`;
        lightText.style.opacity = (1 - progress).toString();
    }
    if (darkText) {
        darkText.style.transform = `translateX(${textOffset}px)`;
        darkText.style.opacity = progress.toString();
    }
}

function startDrag(e) {
    isDragging = true;
    calculateMaxX();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    startX = clientX - currentX;
}

function onDrag(e) {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    currentX = clientX - startX;
    if (currentX < minX) currentX = minX;
    if (currentX > maxX) currentX = maxX;
    updatePositions(currentX, false);
}

function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    const threshold = (minX + maxX) / 2;
    if (currentX > threshold) {
        currentX = maxX;
        isDark = true;
    } else {
        currentX = minX;
        isDark = false;
    }
    updatePositions(currentX, true);
}

if (toggle) {
    toggle.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);

    toggle.addEventListener('touchstart', startDrag, { passive: true });
    window.addEventListener('touchmove', onDrag, { passive: true });
    window.addEventListener('touchend', stopDrag);

    toggle.addEventListener('click', () => {
        calculateMaxX();
        if (Math.abs(currentX - (isDark ? maxX : minX)) < 10) {
            isDark = !isDark;
            currentX = isDark ? maxX : minX;
            updatePositions(currentX, true);
        }
    });
}

window.addEventListener('resize', () => {
    calculateMaxX();
    currentX = isDark ? maxX : minX;
    updatePositions(currentX, false);
});
                          
