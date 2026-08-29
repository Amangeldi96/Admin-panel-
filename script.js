import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

// Модалканы башкаруу функциялары
window.openImageModal = function(url) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImageElement");
    if (modal && modalImg) {
        modalImg.src = url;
        modal.classList.add("active");
    }
}

window.closeImageModal = function() {
    const modal = document.getElementById("imageModal");
    if (modal) {
        modal.classList.remove("active");
    }
}

async function fetchPendingAds() {
    try {
        // React Native тиркемеден чекти VIP сурам катары vip_requests коллекциясына жөнөтөт
        const querySnapshot = await getDocs(collection(db, "vip_requests"));
        let html = "";
        let count = 0;

        querySnapshot.forEach((document) => {
            const req = document.data();
            
            // Текшерүүнү күтүп жаткан сурамдарды гана алабыз
            if (req.status === "pending" || req.status === "pending_approval") {
                count++;
                
                // Чек сүрөтү же жарнама сүрөтү
                const receiptImage = req.receiptUrl || req.paymentReceiptImage || "";
                const adImage = (Array.isArray(req.images) ? req.images[0] : req.images) || "";
                const days = req.requestedDays || req.vipDays || 0;
                const price = req.totalPrice || req.vipTotalCost || 0;
                const adId = req.adId || "";

                html += `
                    <div class="bento-card bento-ad-item" id="card-${document.id}">
                        <div class="media-preview-cluster">
                            ${adImage ? `
                                <div class="media-thumb" onclick="openImageModal('${adImage}')">
                                    <img src="${adImage}" alt="Ad">
                                    <span>Жарнама</span>
                                </div>
                            ` : ''}

                            ${receiptImage ? `
                                <div class="media-thumb" onclick="openImageModal('${receiptImage}')">
                                    <img src="${receiptImage}" alt="Receipt">
                                    <span>Чек</span>
                                </div>
                            ` : '<div style="font-size:10px; color:#ef4444; display:flex; align-items:center;">Чек жок</div>'}
                        </div>

                        <div class="ad-details-stack">
                            <div class="ad-link-row">
                                <span style="font-size: 12px; font-weight: 600; color: #a855f7;">
                                    ${req.adTitle ? req.adTitle : (adId ? 'ID: ' + adId : 'Жарнама сурамы')}
                                </span>
                            </div>
                            <div class="ad-meta-tags">
                                <span>Колдонуучу: <strong>${req.userEmail || '—'}</strong></span>
                                <span>Мөөнөтү: <strong class="dynamic-text">${days} күн</strong></span>
                                <span>Баасы: <strong class="dynamic-text">${price} сом</strong></span>
                            </div>
                        </div>

                        <div class="bento-actions">
                            <button class="bento-btn btn-yes" onclick="approveAd('${document.id}', '${adId}', ${days})" title="Ырастоо">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <button class="bento-btn btn-no" onclick="rejectAd('${document.id}')" title="Четке кагуу">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>
                `;
            }
        });

        if (count === 0) {
            badge.innerText = `0`;
            container.innerHTML = `
                <div class="bento-card bento-empty">
                    <i class="fa-regular fa-circle-check"></i>
                    <p>Текшерүүнү күткөн жарнамалар калбады.</p>
                </div>`;
        } else {
            badge.innerText = `${count}`;
            container.innerHTML = html;
        }
        updateThemeColors(currentProgress);

    } catch (error) {
        console.error("Ката кетти:", error);
        container.innerHTML = `<div class="bento-card bento-empty" style="color: #ef4444;">Ката кетти: ${error.message}</div>`;
    }
}

// Ырастоо функциясы
window.approveAd = async function(requestId, adId, extraDays) {
    try {
        const nowMs = Date.now();
        const addedMs = Number(extraDays) * 24 * 60 * 60 * 1000;

        // 1. Негизги жарнаманын (vip_ads) мөөнөтүн узартабыз жана активдештиребиз
        if (adId) {
            const adRef = doc(db, "vip_ads", adId);
            await updateDoc(adRef, { 
                expiresAt: nowMs + addedMs,
                status: "active" 
            });
        }

        // 2. VIP сурамдын статусун "approved" кылабыз
        const reqRef = doc(db, "vip_requests", requestId);
        await updateDoc(reqRef, { status: "approved" });
        
        // 3. Экрандагы карточканы анимация менен өчүрөбүз
        const card = document.getElementById(`card-${requestId}`);
        if (card) {
            card.style.transform = 'scale(0.95)';
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
                checkEmptyState();
            }, 300);
        }
    } catch (e) {
        alert("Ырастоодо ката кетти: " + e.message);
    }
}

// Четке кагуу функциясы
window.rejectAd = async function(requestId) {
    if (confirm("Бул жарнама сурамын четке кагып өчүргүңүз келеби?")) {
        try {
            await deleteDoc(doc(db, "vip_requests", requestId));
            
            const card = document.getElementById(`card-${requestId}`);
            if (card) {
                card.style.transform = 'scale(0.95)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.remove();
                    checkEmptyState();
                }, 300);
            }
        } catch (e) {
            alert("Ката кетти: " + e.message);
        }
    }
}

function checkEmptyState() {
    const cards = container.getElementsByClassName("bento-ad-item");
    if (cards.length === 0) {
        badge.innerText = `0`;
        container.innerHTML = `
            <div class="bento-card bento-empty">
                <i class="fa-regular fa-circle-check"></i>
                <p>Текшерүүнү күткөн жарнамалар калбады.</p>
            </div>`;
    } else {
        badge.innerText = `${cards.length}`;
    }
}

fetchPendingAds();

// --- Тумблер жана Түнкү/Күндүзгү режим логикасы ---
const body = document.body;
const toggle = document.getElementById('toggle');
const knob = document.getElementById('knob');
const icon = document.getElementById('icon');
const lightText = document.getElementById('mode-light');
const darkText = document.getElementById('mode-dark');

let isDragging = false;
let startX = 0;
let currentX = 0;
const minX = 5;
const maxX = toggle ? (toggle.clientWidth - (knob ? knob.clientWidth : 0) - 5) : 0;
let isDark = false;
let currentProgress = 0;

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
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
        if(!el.classList.contains('dynamic-text') && !el.style.color.includes('a855f7')) {
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
        lightText.style.opacity = 1 - progress;
    }
    if (darkText) {
        darkText.style.transform = `translateX(${textOffset}px)`;
        darkText.style.opacity = progress;
    }
}

function startDrag(e) {
    isDragging = true;
    startX = (e.touches ? e.touches[0].clientX : e.clientX) - currentX;
}

function onDrag(e) {
    if (!isDragging) return;
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    currentX = clientX - startX;
    if (currentX < minX) currentX = minX;
    if (currentX > maxX) currentX = maxX;
    updatePositions(currentX, false);
}

function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    let threshold = (minX + maxX) / 2;
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

    toggle.addEventListener('touchstart', startDrag);
    window.addEventListener('touchmove', onDrag);
    window.addEventListener('touchend', stopDrag);

    toggle.addEventListener('click', (e) => {
        if (Math.abs(currentX - (isDark ? maxX : minX)) < 5) {
            isDark = !isDark;
            currentX = isDark ? maxX : minX;
            updatePositions(currentX, true);
        }
    });
}

currentX = minX;
updatePositions(currentX, false);