// Poop Pet Game

const poop = document.getElementById('poop');
const poopBody = poop.querySelector('.poop-body');
const face = document.getElementById('face');
const eyeLeft = document.getElementById('eyeLeft');
const eyeRight = document.getElementById('eyeRight');
const mouth = document.getElementById('mouth');
const cheeks = document.querySelectorAll('.cheek');
const moodBubble = document.getElementById('moodBubble');

const feedBtn = document.getElementById('feedBtn');
const playBtn = document.getElementById('playBtn');
const cleanBtn = document.getElementById('cleanBtn');

const happinessBar = document.getElementById('happinessBar');
const hungerBar = document.getElementById('hungerBar');
const cleanlinessBar = document.getElementById('cleanlinessBar');
const happinessValue = document.getElementById('happinessValue');
const hungerValue = document.getElementById('hungerValue');
const cleanlinessValue = document.getElementById('cleanlinessValue');

// Pet stats
const pet = {
    happiness: 100,
    hunger: 100,
    cleanliness: 100,
    name: 'Poopy'
};

// Update UI
function updateStats() {
    happinessBar.style.width = pet.happiness + '%';
    hungerBar.style.width = pet.hunger + '%';
    cleanlinessBar.style.width = pet.cleanliness + '%';

    happinessValue.textContent = Math.round(pet.happiness);
    hungerValue.textContent = Math.round(pet.hunger);
    cleanlinessValue.textContent = Math.round(pet.cleanliness);

    // Update mood based on stats
    updateMood();
}

// Get overall mood
function getOverallMood() {
    const avg = (pet.happiness + pet.hunger + pet.cleanliness) / 3;
    if (avg >= 80) return 'happy';
    if (avg >= 50) return 'neutral';
    if (avg >= 25) return 'sad';
    return 'miserable';
}

// Update facial expression based on mood
function updateMood() {
    const mood = getOverallMood();

    // Reset classes
    eyeLeft.className = 'eye left';
    eyeRight.className = 'eye right';
    mouth.className = 'mouth';
    cheeks.forEach(c => c.className = c.className.replace(' blush', ''));
    poopBody.classList.remove('dirty');

    // Apply mood
    switch(mood) {
        case 'happy':
            eyeLeft.classList.add('happy');
            eyeRight.classList.add('happy');
            mouth.classList.add('happy');
            cheeks.forEach(c => c.classList.add('blush'));
            poop.style.animation = 'idle 1.5s ease-in-out infinite';
            break;
        case 'neutral':
            poop.style.animation = 'idle 2s ease-in-out infinite';
            break;
        case 'sad':
            eyeLeft.classList.add('sad');
            eyeRight.classList.add('sad');
            mouth.classList.add('sad');
            poop.style.animation = 'idle 3s ease-in-out infinite';
            break;
        case 'miserable':
            eyeLeft.classList.add('sleepy');
            eyeRight.classList.add('sleepy');
            mouth.classList.add('sad');
            poop.style.animation = 'shake 0.5s ease-in-out infinite';
            break;
    }

    // Show dirty effect if cleanliness is low
    if (pet.cleanliness < 40) {
        poopBody.classList.add('dirty');
    }
}

// Show mood bubble
function showMoodBubble(emoji) {
    moodBubble.textContent = emoji;
    moodBubble.classList.add('show');
    setTimeout(() => {
        moodBubble.classList.remove('show');
    }, 1500);
}

// Actions
function feed() {
    if (pet.hunger >= 100) {
        showMoodBubble('🤢');
        return;
    }

    // Disable button temporarily
    feedBtn.disabled = true;

    // Eating animation
    mouth.classList.add('eating');
    showMoodBubble('🍕');

    setTimeout(() => {
        pet.hunger = Math.min(100, pet.hunger + 25);
        pet.happiness = Math.min(100, pet.happiness + 5);
        pet.cleanliness = Math.max(0, pet.cleanliness - 5);

        mouth.classList.remove('eating');
        updateStats();
        feedBtn.disabled = false;
    }, 1000);
}

function play() {
    if (pet.hunger < 20) {
        showMoodBubble('😫');
        return;
    }

    playBtn.disabled = true;

    // Happy animation
    poop.style.animation = 'happy-bounce 0.4s ease infinite';
    eyeLeft.classList.add('sparkle');
    eyeRight.classList.add('sparkle');
    mouth.classList.add('excited');
    showMoodBubble('🎉');

    setTimeout(() => {
        pet.happiness = Math.min(100, pet.happiness + 30);
        pet.hunger = Math.max(0, pet.hunger - 15);
        pet.cleanliness = Math.max(0, pet.cleanliness - 10);

        eyeLeft.classList.remove('sparkle');
        eyeRight.classList.remove('sparkle');
        mouth.classList.remove('excited');
        updateStats();
        playBtn.disabled = false;
    }, 1500);
}

function clean() {
    if (pet.cleanliness >= 100) {
        showMoodBubble('✨');
        return;
    }

    cleanBtn.disabled = true;

    // Cleaning animation
    poop.style.animation = 'shake 0.2s ease infinite';
    showMoodBubble('🧼');

    setTimeout(() => {
        pet.cleanliness = Math.min(100, pet.cleanliness + 35);
        pet.happiness = Math.min(100, pet.happiness + 10);

        updateStats();
        cleanBtn.disabled = false;
    }, 1200);
}

// Event listeners
feedBtn.addEventListener('click', feed);
playBtn.addEventListener('click', play);
cleanBtn.addEventListener('click', clean);

// Pet the poop
poop.addEventListener('click', () => {
    pet.happiness = Math.min(100, pet.happiness + 2);
    showMoodBubble('💕');
    updateStats();
});

// Stats decay over time
function decayStats() {
    pet.hunger = Math.max(0, pet.hunger - 1);
    pet.happiness = Math.max(0, pet.happiness - 0.5);
    pet.cleanliness = Math.max(0, pet.cleanliness - 0.8);
    updateStats();
}

// Start decay timer (every 3 seconds)
setInterval(decayStats, 3000);

// Initialize
updateStats();
console.log('Poop Pet game initialized!');
