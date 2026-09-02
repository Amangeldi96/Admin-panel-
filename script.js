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
let newVipAdsData = [];   // Жаңы VIP жарнамалар (vip_ads)
let extendRequestsData = []; // Мөөнөт узартуу сурамдары (vip_requests)
let allAdsData = [];      // Негизги жарнамалар (ads)

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

// Базадагы 3 коллекцияны тең реалдуу убакытта угуу
function listenToAllData() {
    if (!container) return;

    // 1. Жаңы VIP Жарнамалар (vip_ads)
    onSnapshot(collection(db, "vip_ads"), (snapshot) => {
        newVipAdsData = [];
        snapshot.forEach((docSnap) => {
            newVipAdsData.push({ docId: docSnap.id, sourceCol: "vip_ads", ...docSnap.data() });
        });
        renderCurrentTab();
    });

    // 2. Мөөнөтүн узартуу сурамдары (vip_requests)
    onSnapshot(collection(db, "vip_requests"), (snapshot) => {
        extendRequestsData = [];
        snapshot.forEach((docSnap) => {
            extendRequestsData.push({ docId: docSnap.id, sourceCol: "vip_requests", ...docSnap.data() });
        });
        renderCurrentTab();
    });

    // 3. Негизги жарнамалар (ads)
    onSnapshot(collection(db, "ads"), (snapshot) => {
        allAdsData = [];
        snapshot.forEach((docSnap) => {
            allAdsData.push({ docId: docSnap.id, sourceCol: "ads", ...docSnap.data() });
        });
        renderCurrentTab();
    });
}

function renderCurrentTab() {
    if (!container) return;
    let html = "";
    let count = 0;

    if (activeTab === 'vip') {
        // Активдүү VIPтер (ads базасындагы)
        const activeVipAds = allAdsData.filter(ad => ad.isVip === true || ad.type === "vip");
        
        count = newVipAdsData.length + extendRequestsData.length + activeVipAds.length;

        // 1. ЖАҢЫ VIP ЖАРНАМАЛАР (vip_ads) - Уруксат күтүүдө
        newVipAdsData.forEach(item => {
            const rawReceipt = item.receiptUrl || item.paymentReceiptImage || item.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            let rawAdImg = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : (item.images || item.image || "");
            const adImage = fixImageUrl(rawAdImg);
            const days = item.requestedDays || item.vipDays || item.days || 0;
            const price = item.totalPrice || item.vipTotalCost || item.price || 0;

            html += `
                <div class="bento-card bento-ad-item" id="card-${item.docId}">
                    <div style="font-size:11px; font-weight:800; color:#c084fc; letter-spacing:1px;">✨ ЖАҢЫ VIP ЖАРНАМА (vip_ads)</div>
                    <div class="media-preview-cluster">
                        ${adImage ? `<div class="media-thumb" onclick="openImageModal('${adImage}')"><img src="${adImage}"></div>` : ''}
                        ${receiptImage ? `<div class="media-thumb" onclick="openImageModal('${receiptImage}')"><img src="${receiptImage}"></div>` : ''}
                    </div>

                    <div class="ad-details-stack">
                        <span style="font-size: 15px; font-weight: 700;">${item.adTitle || item.title || 'Жаңы VIP Жарнама'}</span>
                        <div class="ad-meta-tags">
                            <span>Email: <strong>${item.userEmail || item.email || 'Жок'}</strong></span>
                            <span>Мөөнөтү: <strong>${days} күн</strong> | Баасы: <strong>${price} сом</strong></span>
                        </div>
                    </div>

                    <div class="bento-actions">
                        <button class="bento-btn btn-yes" onclick="approveNewVipFromVipAds('${item.docId}')">
                            <i class="fa-solid fa-check"></i> Уруксат берүү
                        </button>
                        <button class="bento-btn btn-no" onclick="removeItem('${item.docId}', 'vip_ads')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // 2. МӨӨНӨТҮН УЗАРТУУ СУРАМДАРЫ (vip_requests)
        extendRequestsData.forEach(req => {
            const rawReceipt = req.receiptUrl || req.paymentReceiptImage || req.receipt || "";
            const receiptImage = fixImageUrl(rawReceipt);
            const days = req.requestedDays || req.vipDays || req.days || 0;

            html += `
                <div class="bento-card bento-ad-item" id="card-${req.docId}">
                    <div style="font-size:11px; font-weight:800; color:#38bdf8; letter-spacing:1px;">⏳ VIP УЗАРТУУ СУРАМЫ (vip_requests)</div>
                    <div class="media-preview-cluster">
                        ${receiptImage ? `<div class="media-thumb" onclick="openImageModal('${receiptImage}')"><img src="${receiptImage}"></div>` : ''}
                    </div>

                    <div class="ad-details-stack">
                        <span style="font-size: 15px; font-weight: 700;">Жарнама ID: ${req.adId || req.docId}</span>
                        <div class="ad-meta-tags">
                            <span>Кошула турган мөөнөт: <strong>+${days} күн</strong></span>
                        </div>
                    </div>

                    <div class="bento-actions">
                        <button class="bento-btn btn-yes" onclick="approveExtendVipFromRequests('${req.docId}', '${req.adId}', ${days})">
                            <i class="fa-solid fa-clock-rotate-left"></i> Узарттыруу
                        </button>
                        <button class="bento-btn btn-no" onclick="removeItem('${req.docId}', 'vip_requests')">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        // 3. АКТИВДҮҮ VIP ЖАРНАМАЛАР (ads базасынан)
        activeVipAds.forEach(ad => {
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
                        <button class="bento-btn btn-no" onclick="removeItem('${ad.docId}', 'ads')" style="height:36px; font-size:12px;">
                            <i class="fa-solid fa-trash-can"></i> Өчүрүү
                        </button>
                    </div>
                </div>
            `;
        });

    } else {
        // ЖӨНӨКӨЙ ЖАРНАМАЛАР
        const normalAds = allAdsData.filter(ad => !ad.isVip && ad.type !== "vip");
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
                        <button class="bento-btn btn-no" onclick="removeItem('${ad.docId}', 'ads')" style="height:36px; font-size:12px;">
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

window.switchCategory = function(category) {
    activeTab = category;
    document.getElementById('tab-vip')?.classList.toggle('active', category === 'vip');
    document.getElementById('tab-normal')?.classList.toggle('active', category === 'normal');
    renderCurrentTab();
};

// 1. ЖАҢЫ VIP ЖАРНАМАНЫ КАБЫЛ АЛУУ (vip_ads коллекциясынан -> ads базасына сактайт)
window.approveNewVipFromVipAds = async function(vipDocId) {
    try {
        const itemRef = doc(db, "vip_ads", vipDocId);
        const itemSnap = await getDoc(itemRef);

        if (!itemSnap.exists()) {
            alert("Сурам табылган жок!");
            return;
        }

        const data = itemSnap.data();
        const days = Number(data.requestedDays || data.vipDays || data.days || 1);
        const expiresAt = Date.now() + (days * 24 * 60 * 60 * 1000);

        // 'ads' коллекциясына VIP катары сактоо
        const newAdRef = doc(db, "ads", vipDocId);
        await setDoc(newAdRef, {
            ...data,
            isVip: true,
            type: "vip",
            expiresAt: expiresAt,
            status: "active",
            createdAt: Date.now()
        });

        // 'vip_ads' коллекциясынан өчүрүү
        await deleteDoc(itemRef);
        removeCardAnimation(vipDocId);
    } catch (e) {
        alert("Ката: " + e.message);
    }
};

// 2. VIP МӨӨНӨТҮН УЗАРТУУ (vip_requests коллекциясынан -> ads базасындагы мөөнөттү узартат)
window.approveExtendVipFromRequests = async function(requestId, adId, extraDays) {
    try {
        const targetAdId = (adId && adId !== 'undefined') ? adId : requestId;
        const adRef = doc(db, "ads", targetAdId);
        const adSnap = await getDoc(adRef);

        if (!adSnap.exists()) {
            alert("Узартыла турган негизги жарнама (ads) табылган жок!");
            return;
        }

        const adData = adSnap.data();
        const nowMs = Date.now();
        const addedMs = Number(extraDays || 0) * 24 * 60 * 60 * 1000;

        let currentExpireMs = adData.expiresAt?.toMillis ? adData.expiresAt.toMillis() : (typeof adData.expiresAt === 'number' ? adData.expiresAt : 0);
        const baseTime = currentExpireMs > nowMs ? currentExpireMs : nowMs;
        const finalExpiresAt = baseTime + addedMs;

        // 'ads' базасында мөөнөтүн созуу
        await updateDoc(adRef, {
            isVip: true,
            type: "vip",
            expiresAt: finalExpiresAt
        });

        // Аткарылган соң 'vip_requests' коллекциясынан өчүрүү
        await deleteDoc(doc(db, "vip_requests", requestId));
        removeCardAnimation(requestId);
    } catch (e) {
        alert("Узартууда ката чыкты: " + e.message);
    }
};

// ӨЧҮРҮҮ
window.removeItem = async function(docId, colName) {
    if (confirm("Чын эле өчүрүүнү каалайсызбы?")) {
        try {
            await deleteDoc(doc(db, colName, docId));
            removeCardAnimation(docId);
        } catch(e) {
            alert("Ката: " + e.message);
        }
    }
};

function removeCardAnimation(docId) {
    const card = document.getElementById(`card-${docId}`);
    if (card) {
        card.style.transition = 'all 0.3s ease';
        card.style.transform = 'scale(0.9)';
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 300);
    }
}

listenToAllData();
                
