// Vocabulary loaded from external JSON file
let levelData = {};
let categoryKeys = [];
const LEVELS_PER_CATEGORY = 6;

// Game settings
let gameSettings = {
    readingStyle: 'hiragana' // 'hiragana' or 'romaji'
};

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('kanjiDropSettings');
    if (saved) {
        gameSettings = JSON.parse(saved);
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('kanjiDropSettings', JSON.stringify(gameSettings));
}

// Get reading based on current setting
function getReading(vocab) {
    return gameSettings.readingStyle === 'romaji' ? vocab.romaji : vocab.hiragana;
}

const WORDS_TO_UNLOCK = 30;

// Current selection
let selectedCategory = null;

// Progress tracking (saved to localStorage)
// Keys are "category:level" e.g. "numbers:1"
let playerProgress = {
    unlockedLevels: {}, // { "numbers": [1,2,3...], "nature": [1], ... }
    highScores: {},
    levelProgress: {}
};

// Load progress from localStorage
function loadProgress() {
    const saved = localStorage.getItem('kanjiDropProgress');
    if (saved) {
        playerProgress = JSON.parse(saved);
    }
    // Ensure all categories have at least level 1 unlocked
    categoryKeys.forEach(cat => {
        if (!playerProgress.unlockedLevels[cat]) {
            playerProgress.unlockedLevels[cat] = [1];
        }
    });
}

// Save progress to localStorage
function saveProgress() {
    localStorage.setItem('kanjiDropProgress', JSON.stringify(playerProgress));
}

// Get progress key for a category+level
function progressKey(category, level) {
    return `${category}:${level}`;
}

// Game state
let gameState = {
    score: 0,
    currentLevel: 1,
    correctCount: 0,
    blocks: [],
    activeBlock: null,
    isRunning: false,
    spawnInterval: null,
    gameLoop: null,
    fallSpeed: 0.6,
    spawnRate: 2000
};

// DOM elements
const playArea = document.getElementById('playArea');
const answerGrid = document.getElementById('answerGrid');
const scoreDisplay = document.getElementById('scoreDisplay');
const levelDisplay = document.getElementById('levelDisplay');
const progressDisplay = document.getElementById('progressDisplay');
const answerLabel = document.querySelector('.answer-label');

// Screens
const mainMenuScreen = document.getElementById('mainMenuScreen');
const categorySelectScreen = document.getElementById('categorySelectScreen');
const levelSelectScreen = document.getElementById('levelSelectScreen');
const optionsScreen = document.getElementById('optionsScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const levelCompleteScreen = document.getElementById('levelCompleteScreen');
const pauseScreen = document.getElementById('pauseScreen');

// Buttons
const playBtn = document.getElementById('playBtn');
const levelSelectBtn = document.getElementById('levelSelectBtn');
const optionsBtn = document.getElementById('optionsBtn');
const categoryBackBtn = document.getElementById('categoryBackBtn');
const levelBackBtn = document.getElementById('levelBackBtn');
const optionsBackBtn = document.getElementById('optionsBackBtn');
const levelSelectTitle = document.getElementById('levelSelectTitle');
const categoryGrid = document.getElementById('categoryGrid');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const continueBtn = document.getElementById('continueBtn');
const levelCompleteMenuBtn = document.getElementById('levelCompleteMenuBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const pauseRestartBtn = document.getElementById('pauseRestartBtn');
const pauseMenuBtn = document.getElementById('pauseMenuBtn');
const pauseScoreDisplay = document.getElementById('pauseScoreDisplay');

const levelGrid = document.getElementById('levelGrid');
const finalScore = document.getElementById('finalScore');
const levelUnlockMsg = document.getElementById('levelUnlockMsg');
const unlockedLevelName = document.getElementById('unlockedLevelName');

// Options buttons
const hiraganaBtn = document.getElementById('hiraganaBtn');
const romajiBtn = document.getElementById('romajiBtn');

// Load vocabulary and initialize
fetch('vocabulary.json')
    .then(res => res.json())
    .then(data => {
        levelData = data;
        categoryKeys = Object.keys(levelData);
        loadProgress();
        loadSettings();
        updateOptionsUI();
        showScreen(mainMenuScreen);
    })
    .catch(err => console.error('Failed to load vocabulary:', err));

// Show/hide screens
function showScreen(screen) {
    [mainMenuScreen, categorySelectScreen, levelSelectScreen, optionsScreen, gameOverScreen, levelCompleteScreen, pauseScreen].forEach(s => {
        s.classList.add('hidden');
    });
    if (screen) screen.classList.remove('hidden');
}

// Update options UI to reflect current settings
function updateOptionsUI() {
    if (gameSettings.readingStyle === 'romaji') {
        hiraganaBtn.classList.remove('active');
        romajiBtn.classList.add('active');
    } else {
        hiraganaBtn.classList.add('active');
        romajiBtn.classList.remove('active');
    }
    updateAnswerLabel();
}

// Update answer area label based on reading style
function updateAnswerLabel() {
    if (gameSettings.readingStyle === 'romaji') {
        answerLabel.textContent = 'Select the romaji reading:';
    } else {
        answerLabel.textContent = 'Select the hiragana reading:';
    }
}

// Pause game
function pauseGame() {
    if (!gameState.isRunning) return;
    gameState.isRunning = false;
    clearInterval(gameState.spawnInterval);
    clearInterval(difficultyTimer);
    cancelAnimationFrame(gameState.gameLoop);
    pauseScoreDisplay.textContent = gameState.score;
    pauseScreen.classList.remove('hidden');
}

// Resume game
function resumeGame() {
    pauseScreen.classList.add('hidden');
    gameState.isRunning = true;
    gameState.spawnInterval = setInterval(createBlock, gameState.spawnRate);
    startDifficultyTimer();
    gameState.gameLoop = requestAnimationFrame(update);
}

// Render category select grid
function renderCategorySelect() {
    categoryGrid.innerHTML = '';
    categoryKeys.forEach(catKey => {
        const cat = levelData[catKey];
        const unlocked = playerProgress.unlockedLevels[catKey] || [1];
        const totalLevels = Object.keys(cat.levels).length;
        const completedLevels = unlocked.filter(lvl => {
            const key = progressKey(catKey, lvl);
            return (playerProgress.levelProgress[key] || 0) >= WORDS_TO_UNLOCK;
        }).length;

        const card = document.createElement('div');
        card.className = 'category-card';
        card.innerHTML = `
            <div class="cat-icon">${cat.icon}</div>
            <div class="cat-info">
                <div class="cat-name">${cat.name}</div>
                <div class="cat-progress">${completedLevels}/${totalLevels} levels completed</div>
            </div>
        `;
        card.addEventListener('click', () => {
            selectedCategory = catKey;
            renderLevelSelect(catKey);
            showScreen(levelSelectScreen);
        });
        categoryGrid.appendChild(card);
    });
}

// Render level select grid for a specific category
function renderLevelSelect(catKey) {
    const cat = levelData[catKey];
    levelSelectTitle.textContent = cat.name;
    levelGrid.innerHTML = '';
    const totalLevels = Object.keys(cat.levels).length;
    const unlocked = playerProgress.unlockedLevels[catKey] || [1];

    for (let i = 1; i <= totalLevels; i++) {
        const level = cat.levels[i];
        const isUnlocked = unlocked.includes(i);
        const key = progressKey(catKey, i);
        const progress = playerProgress.levelProgress[key] || 0;

        const card = document.createElement('div');
        card.className = `level-card ${isUnlocked ? '' : 'locked'}`;
        card.innerHTML = `
            <div class="level-num">${i}</div>
            <div class="level-name">${level.name}</div>
            <div class="level-status">${isUnlocked ? (progress >= WORDS_TO_UNLOCK ? 'Complete!' : `${progress}/${WORDS_TO_UNLOCK}`) : 'Locked'}</div>
        `;

        if (isUnlocked) {
            card.addEventListener('click', () => startGame(catKey, i));
        }

        levelGrid.appendChild(card);
    }
}

// Get vocabulary for a category + level
function getVocabularyForLevel(catKey, level) {
    return levelData[catKey]?.levels[level]?.vocabulary || levelData[categoryKeys[0]].levels[1].vocabulary;
}

// Get play area dimensions
function getPlayAreaBounds() {
    const rect = playArea.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height
    };
}

// Create a kanji block
function createBlock() {
    if (!gameState.isRunning) return;

    const bounds = getPlayAreaBounds();
    const currentVocab = getVocabularyForLevel(gameState.currentCategory, gameState.currentLevel);
    const vocab = currentVocab[Math.floor(Math.random() * currentVocab.length)];

    const blockWidth = vocab.kanji.length > 1 ? 80 : 60;
    const x = Math.random() * (bounds.width - blockWidth - 20) + 10;

    const block = {
        id: Date.now() + Math.random(),
        vocab: vocab,
        x: x,
        y: 60,
        width: blockWidth,
        element: null
    };

    const el = document.createElement('div');
    el.className = 'kanji-block block-gray spawning';
    el.style.width = `${blockWidth}px`;
    el.style.left = `${x}px`;
    el.style.top = `${block.y}px`;
    el.style.opacity = '0';
    el.textContent = vocab.kanji;
    el.dataset.blockId = block.id;

    playArea.appendChild(el);
    block.element = el;

    setTimeout(() => {
        el.classList.remove('spawning');
        el.style.opacity = '1';
    }, 500);

    gameState.blocks.push(block);

    if (!gameState.activeBlock) {
        setActiveBlock(block);
    }

    updateAnswerButtons();
}

// Set a block as the active (green) one
function setActiveBlock(block) {
    if (gameState.activeBlock && gameState.activeBlock.element) {
        gameState.activeBlock.element.classList.remove('block-active');
        gameState.activeBlock.element.classList.add('block-gray');
    }

    gameState.activeBlock = block;
    currentAnswerBlockId = null; // Force answer buttons to refresh

    if (block && block.element) {
        block.element.classList.remove('block-gray');
        block.element.classList.add('block-active');
    }

    updateAnswerButtons();
}

// Select next active block
function selectNextActiveBlock() {
    if (gameState.blocks.length === 0) {
        gameState.activeBlock = null;
        updateAnswerButtons();
        return;
    }

    const sortedBlocks = [...gameState.blocks].sort((a, b) => b.y - a.y);
    setActiveBlock(sortedBlocks[0]);
}

// Track current answer set
let currentAnswerBlockId = null;

// Update answer buttons
function updateAnswerButtons(forceUpdate = false) {
    if (!forceUpdate && gameState.activeBlock && currentAnswerBlockId === gameState.activeBlock.id) {
        return;
    }

    if (!gameState.activeBlock) {
        currentAnswerBlockId = null;
        return;
    }

    currentAnswerBlockId = gameState.activeBlock.id;

    const correctReading = getReading(gameState.activeBlock.vocab);
    const currentVocab = getVocabularyForLevel(gameState.currentCategory, gameState.currentLevel);
    const decoys = currentVocab
        .filter(v => getReading(v) !== correctReading)
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)
        .map(v => getReading(v));

    const allReadings = [correctReading, ...decoys]
        .sort(() => Math.random() - 0.5);

    answerGrid.innerHTML = '';
    allReadings.forEach(reading => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = reading;
        btn.addEventListener('click', () => handleAnswer(reading, btn));
        answerGrid.appendChild(btn);
    });
}

// Handle answer selection
function handleAnswer(reading, btn) {
    if (!gameState.activeBlock) return;

    const isCorrect = getReading(gameState.activeBlock.vocab) === reading;

    if (isCorrect) {
        const block = gameState.activeBlock;

        btn.classList.add('correct');
        block.element.classList.add('matched');

        const meaningBg = document.createElement('div');
        meaningBg.className = 'meaning-background';
        meaningBg.textContent = block.vocab.meaning;
        playArea.appendChild(meaningBg);
        setTimeout(() => meaningBg.remove(), 1500);

        gameState.score += 10;
        gameState.correctCount++;
        scoreDisplay.textContent = gameState.score;
        progressDisplay.textContent = Math.min(gameState.correctCount, WORDS_TO_UNLOCK);

        // Immediately remove from blocks and select next
        gameState.blocks = gameState.blocks.filter(b => b.id !== block.id);
        selectNextActiveBlock();

        // Remove the DOM element after animation
        setTimeout(() => {
            if (block.element.parentNode) {
                block.element.remove();
            }
        }, 300);

        // Check for level completion (30 correct)
        if (gameState.correctCount >= WORDS_TO_UNLOCK) {
            levelComplete();
        }
    } else {
        btn.classList.add('wrong');
        gameState.score = Math.max(0, gameState.score - 5);
        scoreDisplay.textContent = gameState.score;
    }

    setTimeout(() => {
        btn.classList.remove('correct', 'wrong');
    }, 300);
}

// Level complete
function levelComplete() {
    gameState.isRunning = false;
    clearInterval(gameState.spawnInterval);
    clearInterval(difficultyTimer);
    cancelAnimationFrame(gameState.gameLoop);

    const catKey = gameState.currentCategory;
    const key = progressKey(catKey, gameState.currentLevel);

    // Save progress
    playerProgress.levelProgress[key] = Math.max(
        playerProgress.levelProgress[key] || 0,
        gameState.correctCount
    );

    // Update high score
    playerProgress.highScores[key] = Math.max(
        playerProgress.highScores[key] || 0,
        gameState.score
    );

    // Unlock next level in same category
    const totalLevels = Object.keys(levelData[catKey].levels).length;
    const nextLevel = gameState.currentLevel + 1;
    let unlockedNew = false;
    if (nextLevel <= totalLevels) {
        if (!playerProgress.unlockedLevels[catKey]) {
            playerProgress.unlockedLevels[catKey] = [1];
        }
        if (!playerProgress.unlockedLevels[catKey].includes(nextLevel)) {
            playerProgress.unlockedLevels[catKey].push(nextLevel);
            unlockedNew = true;
        }
    }

    saveProgress();

    if (unlockedNew && levelData[catKey].levels[nextLevel]) {
        unlockedLevelName.textContent = `${levelData[catKey].levels[nextLevel].name}`;
        showScreen(levelCompleteScreen);
    } else {
        finalScore.textContent = gameState.score;
        levelUnlockMsg.classList.add('hidden');
        showScreen(gameOverScreen);
    }
}

// Game over
function gameOver() {
    gameState.isRunning = false;
    clearInterval(gameState.spawnInterval);
    clearInterval(difficultyTimer);
    cancelAnimationFrame(gameState.gameLoop);

    const key = progressKey(gameState.currentCategory, gameState.currentLevel);

    // Save progress even on game over
    playerProgress.levelProgress[key] = Math.max(
        playerProgress.levelProgress[key] || 0,
        gameState.correctCount
    );
    playerProgress.highScores[key] = Math.max(
        playerProgress.highScores[key] || 0,
        gameState.score
    );
    saveProgress();

    finalScore.textContent = gameState.score;
    levelUnlockMsg.classList.add('hidden');
    showScreen(gameOverScreen);
}

// Difficulty timer
let difficultyTimer = null;
function startDifficultyTimer() {
    difficultyTimer = setInterval(() => {
        if (gameState.isRunning) {
            gameState.fallSpeed += 0.02;
            gameState.spawnRate = Math.max(1000, gameState.spawnRate - 50);
            clearInterval(gameState.spawnInterval);
            gameState.spawnInterval = setInterval(createBlock, gameState.spawnRate);
        }
    }, 5000);
}

// Game loop
function update() {
    if (!gameState.isRunning) return;

    const bounds = getPlayAreaBounds();
    const dangerZone = bounds.height * 0.7;

    gameState.blocks.forEach(block => {
        block.y += gameState.fallSpeed;
        block.element.style.top = `${block.y}px`;

        if (block === gameState.activeBlock && block.y + 60 >= dangerZone) {
            if (!block.element.querySelector('.helper-hint')) {
                const hint = document.createElement('div');
                hint.className = 'helper-hint';
                hint.textContent = getReading(block.vocab);
                block.element.appendChild(hint);
            }
        }

        if (block.y + 60 >= bounds.height) {
            gameOver();
        }
    });

    gameState.gameLoop = requestAnimationFrame(update);
}

// Start game
function startGame(catKey, level = 1) {
    gameState = {
        score: 0,
        currentCategory: catKey,
        currentLevel: level,
        correctCount: 0,
        blocks: [],
        activeBlock: null,
        isRunning: true,
        spawnInterval: null,
        gameLoop: null,
        fallSpeed: 0.6,
        spawnRate: 2000
    };

    document.querySelectorAll('.kanji-block').forEach(el => el.remove());

    scoreDisplay.textContent = '0';
    levelDisplay.textContent = `${levelData[catKey].icon} Lv.${level}`;
    progressDisplay.textContent = '0';

    showScreen(null);
    currentAnswerBlockId = null;

    createBlock();
    gameState.spawnInterval = setInterval(createBlock, gameState.spawnRate);
    gameState.gameLoop = requestAnimationFrame(update);
    startDifficultyTimer();
}

// Event listeners
playBtn.addEventListener('click', () => {
    renderCategorySelect();
    showScreen(categorySelectScreen);
});

levelSelectBtn.addEventListener('click', () => {
    renderCategorySelect();
    showScreen(categorySelectScreen);
});

optionsBtn.addEventListener('click', () => {
    updateOptionsUI();
    showScreen(optionsScreen);
});

// Reading style toggle
hiraganaBtn.addEventListener('click', () => {
    gameSettings.readingStyle = 'hiragana';
    saveSettings();
    updateOptionsUI();
});

romajiBtn.addEventListener('click', () => {
    gameSettings.readingStyle = 'romaji';
    saveSettings();
    updateOptionsUI();
});

categoryBackBtn.addEventListener('click', () => {
    showScreen(mainMenuScreen);
});

levelBackBtn.addEventListener('click', () => {
    renderCategorySelect();
    showScreen(categorySelectScreen);
});

optionsBackBtn.addEventListener('click', () => {
    showScreen(mainMenuScreen);
});

restartBtn.addEventListener('click', () => {
    startGame(gameState.currentCategory, gameState.currentLevel);
});

menuBtn.addEventListener('click', () => {
    showScreen(mainMenuScreen);
});

continueBtn.addEventListener('click', () => {
    // Continue to next level in same category
    const catKey = gameState.currentCategory;
    const totalLevels = Object.keys(levelData[catKey].levels).length;
    const nextLevel = gameState.currentLevel + 1;
    if (nextLevel <= totalLevels) {
        startGame(catKey, nextLevel);
    } else {
        showScreen(mainMenuScreen);
    }
});

levelCompleteMenuBtn.addEventListener('click', () => {
    showScreen(mainMenuScreen);
});

// Pause button (score display)
pauseBtn.addEventListener('click', () => {
    pauseGame();
});

resumeBtn.addEventListener('click', () => {
    resumeGame();
});

pauseRestartBtn.addEventListener('click', () => {
    pauseScreen.classList.add('hidden');
    startGame(gameState.currentCategory, gameState.currentLevel);
});

pauseMenuBtn.addEventListener('click', () => {
    // Clean up game state
    gameState.isRunning = false;
    document.querySelectorAll('.kanji-block').forEach(el => el.remove());
    showScreen(mainMenuScreen);
});
