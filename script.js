import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDoc, 
    doc, 
    setDoc,
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
let rawVipAdsData = [];       // vip_ads
let rawVipRequestsData = [];  // vip_requests
let rawAdsData = [];          // ads

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
    } else {
        window.open(url, "_blank");
    }
};

window.closeImageModal = function() {
    const modal = document.getElementById("imageModal");
    if (modal) modal.classList.remove("active");
};

// Реалдуу убакытта коллекцияларды угуу
function listenToAllData() {
    if (!container) return;

    // 1. vip_ads коллекциясын угуу
    onSnapshot(collection(db, "vip_ads"), (snapshot) => {
        rawVipAdsData = [];
        snapshot.forEach((docSnap) => {
            rawVipAdsData.push({ docId: docSnap.id, sourceCol: "vip_ads", ...docSnap.data() });
        });
        renderCurrentTab();
    });

    // 2. vip_requests коллекциясын угуу
    onSnapshot(collection(db, "vip_requests"), (snapshot) => {
        rawVipRequestsData = [];
        snapshot.forEach((docSnap) => {
            rawVipRequestsData.push({ docId: docSnap.id, sourceCol: "vip_requests", ...docSnap.data() });
        });
        renderCurrentTab();
    });

    // 3. ads коллекциясын угуу
    onSnapshot(collection(db, "ads"), (snapshot) => {
        rawAdsData = [];
        snapshot.forEach((docSnap) => {
            rawAdsData.push({ docId: docSnap.id, sourceCol: "ads", ...docSnap.data() });
        });
        renderCurrentTab();
    });
}

function renderCurrentTab() {
    if (!container) return;
    let html = "";
    let count = 0;

    if (activeTab === 'vip') {
        // А) Уруксат күтүп жаткан жаңы VIP жарнамалар (vip_ads)
        const pendingVipAds = rawVipAdsData.filter(item => 
            item.status === "pending" || item.status === "pending_approval" || !item.status
        );

        // Б) Мөөнөт узартуу сурамдары (vip_requests)
        const extendRequests = rawVipRequestsData.filter(req => req.status !== "approved");

        // В) Активдүү (уруксат берилген) VIP Жарнамалар (vip_ads коллекциясынан)
        const activeVipAds = rawVipAdsData.filter(ad => ad.status === "active");

        count = pendingVipAds.length + extendRequests.length + activeVipAds.length;

        // 1. Жаңы VIP сурамдар (vip_ads)
        pendingVipAds.forEach(item => {
            const rawReceipt = item.receiptUrl || item.paymentReceiptImage || item.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            let rawAdImg = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : (item.images || item.image || "");
            const adImage = fixImageUrl(rawAdImg);
            const days = item.requestedDays || item.vipDays || item.days || 0;
            const price = item.totalPrice || item.vipTotalCost || item.price || 0;
            const adId = item.adId || item.docId;

            html += `
                <div class="bento-card bento-ad-item" id="card-${item.docId}">
                    <div style="font-size:11px; font-weight:800; color:#c084fc; letter-spacing:1px; margin-bottom:8px;">✨ ЖАҢЫ VIP ЖАРНАМА</div>
                    <div class="media-preview-cluster">
                        ${adImage ? `<div class="media-thumb" onclick="openImageModal('${adImage}')"><img src="${adImage}"></div>` : ''}
                        ${receiptImage ? `<div class="media-thumb" onclick="openImageModal('${receiptImage}')"><img src="${receiptImage}"></div>` : ''}
                    </div>

                    <div class="ad-details-stack">
                        <span style="font-size: 15px; font-weight: 700;">${item.adTitle || item.title || 'Жаңы VIP Жарнама'}</span>
                        <div class="ad-meta-tags">
                            <span>Email: <strong>${item.userEmail || item.email || 'Көрсөтүлгөн эмес'}</strong></span>
                            <span>Мөөнөтү: <strong>${days} күн</strong> | Баасы: <strong>${price} сом</strong></span>
                        </div>
                    </div>

                    <div class="bento-actions">
                        <button class="bento-btn btn-yes" onclick="approveAd('${item.docId}', '${adId}', ${days}, 'vip_ads')">
                            <i class="fa-solid fa-check"></i> Уруксат берүү
                        </button>
                        <button class="bento-btn btn-no" onclick="rejectAd('${item.docId}', 'vip_ads')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // 2. Мөөнөтүн узартуу сурамдары (vip_requests)
        extendRequests.forEach(req => {
            const rawReceipt = req.receiptUrl || req.paymentReceiptImage || req.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            const days = req.requestedDays || req.vipDays || req.days || 0;
            const adId = req.adId || req.targetAdId || req.postDocId || req.docId;

            html += `
                <div class="bento-card bento-ad-item" id="card-${req.docId}">
                    <div style="font-size:11px; font-weight:800; color:#38bdf8; letter-spacing:1px; margin-bottom:8px;">⏳ VIP МӨӨНӨТ УЗАРТУУ</div>
                    <div class="media-preview-cluster">
                        ${receiptImage ? `<div class="media-thumb" onclick="openImageModal('${receiptImage}')"><img src="${receiptImage}"></div>` : ''}
                    </div>

                    <div class="ad-details-stack">
                        <span style="font-size: 15px; font-weight: 700;">${req.adTitle || req.title || 'Жарнама ID: ' + adId}</span>
                        <div class="ad-meta-tags">
                            <span>Кошула турган мөөнөт: <strong>+${days} күн</strong></span>
                        </div>
                    </div>

                    <div class="bento-actions">
                        <button class="bento-btn btn-yes" onclick="approveAd('${req.docId}', '${adId}', ${days}, 'vip_requests')">
                            <i class="fa-solid fa-clock-rotate-left"></i> Узарттыруу
                        </button>
                        <button class="bento-btn btn-no" onclick="rejectAd('${req.docId}', 'vip_requests')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // 3. Активдүү VIP Жарнамалар (vip_ads базасынан)
        activeVipAds.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || ad.imageUrl || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="bento-card bento-ad-item" id="card-${ad.docId}">
                    <div style="font-size:11px; font-weight:800; color:#eab308; letter-spacing:1px; margin-bottom:8px;">👑 АКТИВДҮҮ VIP</div>
                    <div style="display:flex; gap:12px; align-items:center;">
                        ${adImg ? `<img src="${adImg}" onclick="openImageModal('${adImg}')" style="width:55px; height:55px; object-fit:cover; border-radius:12px;">` : ''}
                        <div>
                            <h4 style="font-size:14px;">${ad.title || ad.adTitle || 'VIP Жарнама'}</h4>
                            <p style="font-size:12px; color:#c084fc; font-weight:700;">${ad.price ? ad.price + ' сом' : ''}</p>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top:10px;">
                        <button class="bento-btn btn-no" onclick="rejectAd('${ad.docId}', 'vip_ads')" style="height:36px; font-size:12px;">
                            <i class="fa-solid fa-trash-can"></i> Өчүрүү
                        </button>
                    </div>
                </div>
            `;
        });

    } else {
        // ЖӨНӨКӨЙ ЖАРНАМАЛАР (ads коллекциясынан)
        const normalAds = rawAdsData.filter(ad => !ad.isVip && ad.type !== "vip");
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
                    <div style="display:flex; justify-content:flex-end; margin-top:10px;">
                        <button class="bento-btn btn-no" onclick="rejectAd('${ad.docId}', 'ads')" style="height:36px; font-size:12px;">
                            <i class="fa-solid fa-trash-can"></i> Өчүрүү
                        </button>
                    </div>
                </div>
            `;
        });
    }

    if (badge) badge.innerText = `${count}`;
    if (count === 0) {
        container.innerHTML = `<div class="bento-card bento-empty"><p>Текшерүүнү күткөн жарнамалар калбады.</p></div>`;
    } else {
        container.innerHTML = html;
    }
}

window.switchCategory = function(category) {
    activeTab = category;
    document.getElementById('tab-vip')?.classList.toggle('active', category === 'vip');
    document.getElementById('tab-normal')?.classList.toggle('active', category === 'normal');
    renderCurrentTab();
};

// МӨӨНӨТ ТЕКШЕРҮҮ ЖАНА УЗАРТУУ ЛОГИКАСЫ (ОҢДОЛГОН)
window.approveAd = async function(requestId, adId, extraDays, sourceCol) {
    try {
        const nowMs = Date.now();
        const addedMs = Number(extraDays || 0) * 24 * 60 * 60 * 1000;
        const targetAdId = (adId && adId !== 'undefined') ? adId : requestId;

        // 1. Алгач коллекциялардан маалыматты алуу
        let vipRef = doc(db, "vip_ads", targetAdId);
        let vipSnap = await getDoc(vipRef);

        let sourceData = {};

        if (vipSnap.exists()) {
            sourceData = vipSnap.data();
        } else {
            // Эгер vip_ads ичинде азырынча жок болсо, vip_requests же ads ичинен издейбиз
            const reqRef = doc(db, "vip_requests", requestId);
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
                sourceData = reqSnap.data();
            } else {
                const adRef = doc(db, "ads", targetAdId);
                const adSnap = await getDoc(adRef);
                if (adSnap.exists()) sourceData = adSnap.data();
            }
        }

        // Убакыт эсептөө
        let currentExpireMs = 0;
        if (sourceData.expiresAt?.toMillis) {
            currentExpireMs = sourceData.expiresAt.toMillis();
        } else if (typeof sourceData.expiresAt === 'number') {
            currentExpireMs = sourceData.expiresAt;
        }

        const baseTime = currentExpireMs > nowMs ? currentExpireMs : nowMs;
        const finalExpiresAt = baseTime + addedMs;

        // 2. VIP жарнама катары 'vip_ads' коллекциясында статус активдештирилет
        await setDoc(vipRef, { 
            ...sourceData,
            isVip: true,
            type: "vip",
            expiresAt: finalExpiresAt,
            status: "active",
            updatedAt: nowMs
        }, { merge: true });

        // 3. Эгерде бул жөнөкөй жарнамадан VIP болгон болсо же vip_requests'тен келген болсо, 
        // негизги 'ads' базасында кайталанбашы үчүн isVip: false же тазалап коюу
        const mainAdRef = doc(db, "ads", targetAdId);
        const mainAdSnap = await getDoc(mainAdRef);
        if (mainAdSnap.exists()) {
            await updateDoc(mainAdRef, { isVip: false, type: "normal" });
        }

        // 4. Сурамдардан убактылуу маалыматтарды тазалоо
        if (sourceCol === "vip_requests") {
            await deleteDoc(doc(db, "vip_requests", requestId));
        }

        removeCardAnimation(requestId);

    } catch (e) {
        console.error("Ырастоодо ката:", e);
        alert("Ырастоодо ката кетти: " + e.message);
    }
};

// Жарнаманы четке кагуу же өчүрүү
window.rejectAd = async function(requestId, sourceCol) {
    if (confirm("Бул жарнаманы өчүргүңүз келеби?")) {
        try {
            const targetCol = sourceCol || "vip_requests";
            await deleteDoc(doc(db, targetCol, requestId));
            removeCardAnimation(requestId);
        } catch (e) {
            alert("Ката кетти: " + e.message);
        }
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