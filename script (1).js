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
const counterLabel = document.getElementById("counter-label");

let activeTab = 'pending'; 
let rawVipAdsData = [];       
let rawVipRequestsData = [];  
let rawAdsData = [];          

function fixImageUrl(url) {
    if (!url || typeof url !== 'string') return "";
    let cleanUrl = url.trim();
    if (cleanUrl.includes("ibb.co/") && !cleanUrl.includes("i.ibb.co/")) {
        cleanUrl = cleanUrl.replace("ibb.co/", "i.ibb.co/") + ".jpg";
    }
    return cleanUrl;
}

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

function listenToAllData() {
    if (!container) return;

    onSnapshot(collection(db, "vip_ads"), (snapshot) => {
        rawVipAdsData = [];
        snapshot.forEach((docSnap) => {
            rawVipAdsData.push({ docId: docSnap.id, sourceCol: "vip_ads", ...docSnap.data() });
        });
        renderCurrentTab();
    });

    onSnapshot(collection(db, "vip_requests"), (snapshot) => {
        rawVipRequestsData = [];
        snapshot.forEach((docSnap) => {
            rawVipRequestsData.push({ docId: docSnap.id, sourceCol: "vip_requests", ...docSnap.data() });
        });
        renderCurrentTab();
    });

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

    // SVG Өчүрүү (Корзина) иконкасы
    const deleteSvgIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

    if (activeTab === 'pending') {
        const pendingAds = rawAdsData.filter(ad => ad.status === "pending" || !ad.status);
        const pendingVipAds = rawVipAdsData.filter(item => 
            item.status === "pending" || item.status === "pending_approval" || !item.status
        );
        const extendRequests = rawVipRequestsData.filter(req => req.status !== "approved");

        count = pendingAds.length + pendingVipAds.length + extendRequests.length;
        if (counterLabel) counterLabel.innerText = "📊 Жаңы жарнамалар";

        pendingAds.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="ad-item" id="card-${ad.docId}">
                    <button class="card-delete-icon-btn" onclick="rejectAd('${ad.docId}', 'ads')" title="Өчүрүү">${deleteSvgIcon}</button>
                    <div class="ad-tag vip-new-text">📌 ЖАҢЫ ЖАРНАМА</div>
                    <div class="ad-images">
                        ${adImg ? `<div class="ad-thumb"><img src="${adImg}" onclick="openImageModal('${adImg}')"></div>` : ''}
                    </div>
                    <div class="ad-title">${ad.title || 'Жарнама'}</div>
                    <div class="ad-meta">
                        <span>Баасы: <strong>${ad.price ? ad.price + ' сом' : 'Көрсөтүлгөн эмес'}</strong></span>
                    </div>
                    <div class="ad-actions">
                        <button class="der-btn btn-approve" onclick="approveNormalAd('${ad.docId}')">Уруксат</button>
                    </div>
                </div>
            `;
        });

        pendingVipAds.forEach(item => {
            const rawReceipt = item.receiptUrl || item.paymentReceiptImage || item.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            let rawAdImg = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : (item.images || item.image || "");
            const adImage = fixImageUrl(rawAdImg);
            const days = item.requestedDays || item.vipDays || item.days || 0;
            const price = item.totalPrice || item.vipTotalCost || item.price || 0;
            const adId = item.adId || item.docId;

            html += `
                <div class="ad-item vip" id="card-${item.docId}">
                    <button class="card-delete-icon-btn" onclick="rejectAd('${item.docId}', 'vip_ads')" title="Өчүрүү">${deleteSvgIcon}</button>
                    <div class="ad-tag vip-new-text">✨ ЖАҢЫ VIP СУРАМ</div>
                    <div class="ad-images">
                        ${adImage ? `<div class="ad-thumb"><img src="${adImage}" onclick="openImageModal('${adImage}')"></div>` : ''}
                        ${receiptImage ? `<div class="ad-thumb"><img src="${receiptImage}" onclick="openImageModal('${receiptImage}')"></div>` : ''}
                    </div>
                    <div class="ad-title">${item.adTitle || item.title || 'Жаңы VIP Жарнама'}</div>
                    <div class="ad-meta">
                        <span>Мөөнөтү: <strong>${days} күн</strong> | Баасы: <strong>${price} сом</strong></span>
                    </div>
                    <div class="ad-actions">
                        <button class="der-btn btn-approve" onclick="approveAd('${item.docId}', '${adId}', ${days}, 'vip_ads')">Уруксат</button>
                    </div>
                </div>
            `;
        });

        extendRequests.forEach(req => {
            const rawReceipt = req.receiptUrl || req.paymentReceiptImage || req.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            const days = req.requestedDays || req.vipDays || req.days || 0;
            const adId = req.adId || req.targetAdId || req.postDocId || req.docId;

            html += `
                <div class="ad-item vip" id="card-${req.docId}">
                    <button class="card-delete-icon-btn" onclick="rejectAd('${req.docId}', 'vip_requests')" title="Өчүрүү">${deleteSvgIcon}</button>
                    <div class="ad-tag vip-extend-text">⏳ VIP МӨӨНӨТ УЗАРТУУ</div>
                    <div class="ad-images">
                        ${receiptImage ? `<div class="ad-thumb"><img src="${receiptImage}" onclick="openImageModal('${receiptImage}')"></div>` : ''}
                    </div>
                    <div class="ad-title">${req.adTitle || req.title || 'Жарнама ID: ' + adId}</div>
                    <div class="ad-meta">
                        <span>Кошула турган мөөнөт: <strong>+${days} күн</strong></span>
                    </div>
                    <div class="ad-actions">
                        <button class="der-btn btn-approve" onclick="approveAd('${req.docId}', '${adId}', ${days}, 'vip_requests')">Узарттыруу</button>
                    </div>
                </div>
            `;
        });

    } else if (activeTab === 'vip') {
        const activeVipAds = rawVipAdsData.filter(ad => ad.status === "active");
        count = activeVipAds.length;
        if (counterLabel) counterLabel.innerText = "📊 VIP Жарнамалар";

        activeVipAds.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || ad.imageUrl || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="ad-item vip" id="card-${ad.docId}">
                    <button class="card-delete-icon-btn" onclick="rejectAd('${ad.docId}', 'vip_ads')" title="Өчүрүү">${deleteSvgIcon}</button>
                    <div class="ad-tag vip-active-text">👑 АКТИВДҮҮ VIP</div>
                    <div class="ad-images">
                        ${adImg ? `<div class="ad-thumb"><img src="${adImg}" onclick="openImageModal('${adImg}')"></div>` : ''}
                    </div>
                    <div class="ad-title">${ad.title || ad.adTitle || 'VIP Жарнама'}</div>
                    <div class="ad-meta">
                        <span>Баасы: <strong>${ad.price ? ad.price + ' сом' : 'Көрсөтүлгөн эмес'}</strong></span>
                    </div>
                </div>
            `;
        });

    } else {
        const normalAds = rawAdsData.filter(ad => ad.status === "approved" || (ad.status !== "pending" && !ad.isVip && ad.type !== "vip"));
        count = normalAds.length;
        if (counterLabel) counterLabel.innerText = "📊 Жөнөкөй жарнамалар";

        normalAds.forEach(ad => {
            const rawImg = Array.isArray(ad.images) && ad.images.length > 0 ? ad.images[0] : (ad.image || "");
            const adImg = fixImageUrl(rawImg);

            html += `
                <div class="ad-item" id="card-${ad.docId}">
                    <button class="card-delete-icon-btn" onclick="rejectAd('${ad.docId}', 'ads')" title="Өчүрүү">${deleteSvgIcon}</button>
                    <div class="ad-images">
                        ${adImg ? `<div class="ad-thumb"><img src="${adImg}" onclick="openImageModal('${adImg}')"></div>` : ''}
                    </div>
                    <div class="ad-title">${ad.title || 'Жөнөкөй Жарнама'}</div>
                    <div class="ad-meta">
                        <span>Баасы: <strong>${ad.price ? ad.price + ' сом' : 'Көрсөтүлгөн эмес'}</strong></span>
                    </div>
                </div>
            `;
        });
    }

    if (badge) badge.innerText = `${count}`;
    if (count === 0) {
        container.innerHTML = `<div class="empty-state"><p>Бул бөлүмдө маалыматтар жок.</p></div>`;
    } else {
        container.innerHTML = html;
    }
}

window.switchCategory = function(category) {
    activeTab = category;
    document.getElementById('tab-pending')?.classList.toggle('active', category === 'pending');
    document.getElementById('tab-vip')?.classList.toggle('active', category === 'vip');
    document.getElementById('tab-normal')?.classList.toggle('active', category === 'normal');
    renderCurrentTab();
};

window.approveNormalAd = async function(adId) {
    try {
        const adRef = doc(db, "ads", adId);
        await updateDoc(adRef, { status: "approved" });
        removeCardAnimation(adId);
    } catch (e) {
        console.error("Ката:", e);
        alert("Ката кетти: " + e.message);
    }
};

window.approveAd = async function(requestId, adId, extraDays, sourceCol) {
    try {
        const nowMs = Date.now();
        const addedMs = Number(extraDays || 0) * 24 * 60 * 60 * 1000;
        const targetAdId = (adId && adId !== 'undefined') ? adId : requestId;

        let vipRef = doc(db, "vip_ads", targetAdId);
        let vipSnap = await getDoc(vipRef);
        let sourceData = {};

        if (vipSnap.exists()) {
            sourceData = vipSnap.data();
        } else {
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

        let currentExpireMs = 0;
        if (sourceData.expiresAt?.toMillis) {
            currentExpireMs = sourceData.expiresAt.toMillis();
        } else if (typeof sourceData.expiresAt === 'number') {
            currentExpireMs = sourceData.expiresAt;
        }

        const baseTime = currentExpireMs > nowMs ? currentExpireMs : nowMs;
        const finalExpiresAt = baseTime + addedMs;

        await setDoc(vipRef, { 
            ...sourceData,
            isVip: true,
            type: "vip",
            expiresAt: finalExpiresAt,
            status: "active",
            updatedAt: nowMs
        }, { merge: true });

        if (sourceCol === "vip_requests") {
            await deleteDoc(doc(db, "vip_requests", requestId));
        }

        removeCardAnimation(requestId);

    } catch (e) {
        console.error("Ырастоодо ката:", e);
        alert("Ырастоодо ката кетти: " + e.message);
    }
};

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
