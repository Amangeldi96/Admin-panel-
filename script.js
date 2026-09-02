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

let activeTab = 'vip';
let allPendingRequests = [];
let allActiveAds = [];

// Сүрөт шилтемесин ондоо
function fixImageUrl(url) {
    if (!url || typeof url !== 'string') return "";
    let cleanUrl = url.trim();
    if (cleanUrl.includes("ibb.co/") && !cleanUrl.includes("i.ibb.co/")) {
        cleanUrl = cleanUrl.replace("ibb.co/", "i.ibb.co/") + ".jpg";
    }
    return cleanUrl;
}

// Модалка ачуу/жабуу
window.openImageModal = function(url) {
    if (!url) return;
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImageElement");
    
    if (modal && modalImg) {
        modalImg.src = url;
        modal.classList.add("active");
    } else {
        window.open(url, "_blank");
    }
};

window.closeImageModal = function() {
    const modal = document.getElementById("imageModal");
    if (modal) {
        modal.classList.remove("active");
    }
};

// Firestore'дон реальный убакытта маалымат алуу
function listenToAllData() {
    if (!container) return;

    onSnapshot(collection(db, "vip_requests"), (snapshot) => {
        allPendingRequests = [];
        snapshot.forEach((docSnap) => {
            allPendingRequests.push({ docId: docSnap.id, sourceCol: "vip_requests", ...docSnap.data() });
        });
        renderCurrentTab();
    });

    onSnapshot(collection(db, "ads"), (snapshot) => {
        allActiveAds = [];
        snapshot.forEach((docSnap) => {
            allActiveAds.push({ docId: docSnap.id, sourceCol: "ads", ...docSnap.data() });
        });
        renderCurrentTab();
    });
}

// Менюдагы экранды сүрөтөө
function renderCurrentTab() {
    if (!container) return;
    let html = "";
    let count = 0;

    if (activeTab === 'vip') {
        const pendingVip = allPendingRequests.filter(req => req.status === "pending" || req.status === "pending_approval");
        const activeVip = allActiveAds.filter(ad => ad.isVip === true || ad.type === "vip");
        count = pendingVip.length + activeVip.length;

        // Күтүүдөгү VIP
        pendingVip.forEach(req => {
            const rawReceipt = req.receiptUrl || req.paymentReceiptImage || req.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            let rawAdImg = Array.isArray(req.images) && req.images.length > 0 ? req.images[0] : (req.images || req.image || "");
            const adImage = fixImageUrl(rawAdImg);
            const days = req.requestedDays || req.vipDays || 0;
            const price = req.totalPrice || req.vipTotalCost || 0;

            html += `
                <div class="bento-card bento-ad-item" id="card-${req.docId}">
                    <div style="font-size:11px; font-weight:800; color:#c084fc; letter-spacing:1px;">⏳ VIP СУРАМ</div>
                    <div class="media-preview-cluster">
                        ${adImage ? `<div class="media-thumb" onclick="openImageModal('${adImage}')"><img src="${adImage}"></div>` : ''}
                        ${receiptImage ? `<div class="media-thumb" onclick="openImageModal('${receiptImage}')"><img src="${receiptImage}"></div>` : ''}
                    </div>

                    <div class="ad-details-stack">
                        <span style="font-size: 15px; font-weight: 700;">${req.adTitle || req.title || 'VIP Сурам ID: ' + req.docId}</span>
                        <div class="ad-meta-tags">
                            <span>Email: <strong>${req.userEmail || req.email || 'Жок'}</strong></span>
                            <span>Мөөнөтү: <strong>${days} күн</strong> | Баасы: <strong>${price} сом</strong></span>
                        </div>
                    </div>

                    <div class="bento-actions">
                        <button class="bento-btn btn-yes" onclick="approveAd('${req.docId}', '${req.adId}', ${days}, '${req.sourceCol}')">
                            <i class="fa-solid fa-check"></i> Ырастоо
                        </button>
                        <button class="bento-btn btn-no" onclick="rejectAd('${req.docId}', '${req.sourceCol}')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // Активдүү VIP
        activeVip.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="bento-card bento-ad-item" id="card-${ad.docId}">
                    <div style="font-size:11px; font-weight:800; color:#eab308; letter-spacing:1px;">👑 АКТИВДҮҮ VIP</div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${adImg ? `<img src="${adImg}" onclick="openImageModal('${adImg}')" style="width:55px; height:55px; object-fit:cover; border-radius:12px;">` : ''}
                        <div>
                            <h4 style="font-size:14px;">${ad.title || 'VIP Жарнама'}</h4>
                            <p style="font-size:12px; color:#c084fc; font-weight:700;">${ad.price ? ad.price + ' сом' : ''}</p>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:flex-end;">
                        <button class="bento-btn btn-no" onclick="deleteAd('${ad.docId}', 'ads')" style="height:36px; font-size:12px;">
                            <i class="fa-solid fa-trash-can"></i> Өчүрүү
                        </button>
                    </div>
                </div>
            `;
        });

    } else {
        // Жөнөкөй Жарнамалар
        const normalAds = allActiveAds.filter(ad => !ad.isVip && ad.type !== "vip");
        count = normalAds.length;

        normalAds.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="bento-card bento-ad-item" id="card-${ad.docId}">
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${adImg ? `<img src="${adImg}" onclick="openImageModal('${adImg}')" style="width:55px; height:55px; object-fit:cover; border-radius:12px;">` : ''}
                        <div>
                            <h4 style="font-size:14px;">${ad.title || 'Жөнөкөй Жарнама'}</h4>
                            <p style="font-size:12px; color:#cbd5e1;">${ad.price ? ad.price + ' сом' : ''}</p>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:flex-end;">
                        <button class="bento-btn btn-no" onclick="deleteAd('${ad.docId}', 'ads')" style="height:36px; font-size:12px;">
                            <i class="fa-solid fa-trash-can"></i> Өчүрүү
                        </button>
                    </div>
                </div>
            `;
        });
    }

    if (badge) badge.innerText = `${count}`;
    if (count === 0) {
        container.innerHTML = `<div class="bento-card bento-empty"><p>Бул бөлүмдө тизме бош.</p></div>`;
    } else {
        container.innerHTML = html;
    }
}

// Категорияны которуу
window.switchCategory = function(category) {
    activeTab = category;
    document.getElementById('tab-vip')?.classList.toggle('active', category === 'vip');
    document.getElementById('tab-normal')?.classList.toggle('active', category === 'normal');
    renderCurrentTab();
};

// VIP Ырастоо
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
            let currentExpireMs = currentData.expiresAt?.toMillis ? currentData.expiresAt.toMillis() : (typeof currentData.expiresAt === 'number' ? currentData.expiresAt : 0);
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
            await updateDoc(doc(db, "vip_requests", requestId), { status: "approved" });
        }
        removeCardAnimation(requestId);
    } catch (e) {
        alert("Ката: " + e.message);
    }
};

// Четке кагуу
window.rejectAd = async function(requestId, sourceCol) {
    if (confirm("VIP сурамды четке кагасызбы?")) {
        await deleteDoc(doc(db, sourceCol || "vip_requests", requestId));
        removeCardAnimation(requestId);
    }
};

// Өчүрүү
window.deleteAd = async function(docId, colName) {
    if (confirm("Өчүрүүнү каалайсызбы?")) {
        await deleteDoc(doc(db, colName || "ads", docId));
        removeCardAnimation(docId);
    }
};

function removeCardAnimation(requestId) {
    const card = document.getElementById(`card-${requestId}`);
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.transform = 'scale(0.9)';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
    }
}

listenToAllData();
                         
