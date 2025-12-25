const share = (platform) => {
    const text = `Накрадох цели ${score} € в ПРАС-МАН, преди народът да ме свали! Играй и ти тук:`;
    const url = window.location.href;
    let shareUrl = "";

    if (platform === "fb") {
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    } else if (platform === "x") {
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    } else if (platform === "bsky") {
        shareUrl = `https://bsky.app/intent/compose?text=${encodeURIComponent(text + " " + url)}`;
    } else if (platform === "email") {
        shareUrl = `mailto:?subject=ПРАС-МАН: Моят резултат&body=${encodeURIComponent(text + "\nИграй тук: " + url)}`;
    }

    if (shareUrl) {
        window.open(shareUrl, "_blank");
    }
};

const copyLink = () => {
    const url = window.location.href;
    const text = `Накрадох ${score} €. Играй и ти ПРАС-МАН тук: ${url}`;

    navigator.clipboard.writeText(text).then(() => {
        alert("Линкът и резултатът са копирани! Сложи ги в TikTok или Telegram.");
    });
};
