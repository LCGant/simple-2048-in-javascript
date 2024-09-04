document.addEventListener("DOMContentLoaded", () => {
    // Elements
    const gridContainer = document.querySelector(".grid-container");
    const gameContainer = document.querySelector(".game-container");
    const gameOverOverlay = document.getElementById("gameOverOverlay");
    const restartButton = document.getElementById("restartButton");
    const difficultySelector = document.getElementById("difficulty");
    const scoreElement = document.getElementById("score");
    const bestScoreElement = document.getElementById("best-score");

    // Variables
    let gridSize = parseInt(difficultySelector.value); // Grid size based on difficulty
    let tileSize = 50; // Size of each tile
    const tileGap = 10; // Gap between tiles
    let grid = []; // Array to hold grid cells
    let score = 0; // Current score
    let bestScore = 0; // Best score
    let touchStartX = 0; // Touch start X coordinate
    let touchStartY = 0; // Touch start Y coordinate

    // Function to adjust font size in grid cells
    function adjustFontSize() {
        const cells = document.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            const cellWidth = cell.offsetWidth;
            const cellHeight = cell.offsetHeight;
            const maxFontSize = Math.min(cellWidth, cellHeight) / 5; 
            cell.style.fontSize = `${maxFontSize}px`;
        });
    }
    
    // Event listeners for resize and DOMContentLoaded to adjust font size
    window.addEventListener('resize', adjustFontSize);
    document.addEventListener('DOMContentLoaded', adjustFontSize);

    // Load the best score from local storage
    function loadBestScore() {
        const savedBestScores = JSON.parse(localStorage.getItem("bestScores")) || {};
        bestScore = savedBestScores[gridSize] || 0;
        bestScoreElement.textContent = bestScore;
    }

    // Save the current best score to local storage
    function saveBestScore() {
        const savedBestScores = JSON.parse(localStorage.getItem("bestScores")) || {};
        savedBestScores[gridSize] = bestScore;
        localStorage.setItem("bestScores", JSON.stringify(savedBestScores));
    }

    // Update the best score if the current score is higher
    function updateBestScore() {
        if (score > bestScore) {
            bestScore = score;
            bestScoreElement.textContent = bestScore; 
            saveBestScore(); 
        }
    }

    // Event listener for difficulty change
    difficultySelector.addEventListener("change", () => {
        gridSize = parseInt(difficultySelector.value); 
        resetGame(); 
        difficultySelector.blur(); 
    });

    // Update CSS variables for grid and game dimensions
    function updateCSSVariables() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const isDesktop = screenWidth >= 1024;
        const maxGridSize = isDesktop
            ? Math.min(screenWidth, screenHeight) - 180
            : Math.min(screenWidth, screenHeight) - 100;
        tileSize = Math.floor((maxGridSize - (gridSize - 1) * tileGap) / gridSize);

        const gridWidth = gridSize * (tileSize + tileGap) - tileGap;
        const gridHeight = gridSize * (tileSize + tileGap) - tileGap;
        const gameWidth = gridWidth + 20; 
        const gameHeight = gridHeight + 20; 

        document.documentElement.style.setProperty('--grid-size', gridSize);
        document.documentElement.style.setProperty('--tile-size', `${tileSize}px`);
        document.documentElement.style.setProperty('--tile-gap', `${tileGap}px`);
        document.documentElement.style.setProperty('--grid-width', `${gridWidth}px`);
        document.documentElement.style.setProperty('--grid-height', `${gridHeight}px`);
        document.documentElement.style.setProperty('--game-width', `${gameWidth}px`);
        document.documentElement.style.setProperty('--game-height', `${gameHeight}px`);
    }

    // Create the grid and initialize game
    function createGrid() {
        gridContainer.innerHTML = ''; 
        grid = [];

        updateCSSVariables(); 

        for (let i = 0; i < gridSize * gridSize; i++) {
            const gridCell = document.createElement("div");
            gridCell.classList.add("grid-cell");
            gridContainer.appendChild(gridCell);

            grid.push({
                value: 0,
                element: gridCell,
            });
        }

        addNumber(); // Add initial numbers to the grid
        addNumber();
    }

    // Add a number (2 or 4) to a random empty cell
    function addNumber() {
        let emptyCells = grid.filter(cell => cell.value === 0);
        if (emptyCells.length > 0) {
            let randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            randomCell.value = Math.random() > 0.5 ? 2 : 4;
            updateGrid();
        }
    }

    // Update the grid display based on cell values
    function updateGrid() {
        grid.forEach(cell => {
            cell.element.textContent = cell.value === 0 ? "" : cell.value;
            cell.element.style.backgroundColor = getColor(cell.value);
        });

        if (checkGameOver()) {
            showGameOver();
        }
    }

    // Get color for a given tile value
    function getColor(value) {
        const baseColors = {
            2: "#eee4da",
            4: "#ede0c8",
            8: "#f2b179",
            16: "#f59563",
            32: "#f67c5f",
            64: "#f65e3b",
            128: "#edcf72",
            256: "#edcc61",
            512: "#edc850",
            1024: "#edc53f",
            2048: "#edc22e"
        };
    
        if (value <= 2048) {
            return baseColors[value] || "#cdc1b4";
        } else {
            const baseColor = 0xFF6600; 
            const scaleFactor = Math.log2(value / 2048);
            const red = Math.min(255, Math.floor(((baseColor >> 16) & 0xFF) + (scaleFactor * 50)));
            const green = Math.min(255, Math.floor(((baseColor >> 8) & 0xFF) + (scaleFactor * 30)));
            const blue = Math.min(255, Math.floor((baseColor & 0xFF) + (scaleFactor * 20)));
    
            return `rgb(${red}, ${green}, ${blue})`;
        }
    }

    // Check if the game is over
    function checkGameOver() {
        if (grid.some(cell => cell.value === 0)) {
            return false;
        }

        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                let index = i * gridSize + j;
                let cellValue = grid[index].value;

                if (cellValue === 0) return false;

                if (j < gridSize - 1 && grid[index + 1].value === cellValue) return false;
                if (i < gridSize - 1 && grid[index + gridSize].value === cellValue) return false;
            }
        }

        return true;
    }

    // Handle movement of tiles based on direction
    function move(direction) {
        let moved = false;
        let tempGrid = grid.map(cell => ({ ...cell }));
        let points = 0; 

        function moveLine(line) {
            let tempLine = line.map(cell => cell.value);
            tempLine = tempLine.filter(val => val !== 0);

            for (let i = 0; i < tempLine.length - 1; i++) {
                if (tempLine[i] === tempLine[i + 1]) {
                    points += tempLine[i] * 2; 
                    tempLine[i] *= 2;
                    tempLine[i + 1] = 0;
                }
            }

            tempLine = tempLine.filter(val => val !== 0);
            while (tempLine.length < gridSize) {
                tempLine.push(0);
            }

            return tempLine;
        }

        for (let i = 0; i < gridSize; i++) {
            let line = [];
            for (let j = 0; j < gridSize; j++) {
                let index = (direction === 'left' || direction === 'right') ? i * gridSize + j : j * gridSize + i;
                if (direction === 'right' || direction === 'down') {
                    line.unshift(grid[index]);
                } else {
                    line.push(grid[index]);
                }
            }

            let updatedLine = moveLine(line);
            if (updatedLine.some((val, index) => val !== line[index].value)) {
                moved = true;
            }

            for (let j = 0; j < gridSize; j++) {
                let index = (direction === 'left' || direction === 'right') ? i * gridSize + j : j * gridSize + i;
                grid[index].value = updatedLine[direction === 'right' || direction === 'down' ? gridSize - 1 - j : j];
            }
        }

        if (moved) {
            score += points; 
            scoreElement.textContent = score; 
            updateBestScore(); 
            updateGrid();
            animateCells(); 
            setTimeout(addNumber, 200);
        }
    }

    // Add animation to cells when they move
    function animateCells() {
        grid.forEach(cell => {
            cell.element.classList.add('move');
        });

        setTimeout(() => {
            grid.forEach(cell => {
                cell.element.classList.remove('move');
            });
        }, 200); 
    }

    // Handle keyboard controls for movement
    function control(e) {
        switch (e.key) {
            case "ArrowLeft":
                move('left');
                break;
            case "ArrowRight":
                move('right');
                break;
            case "ArrowUp":
                move('up');
                break;
            case "ArrowDown":
                move('down');
                break;
        }
    }

    // Handle touch controls for movement
    function handleTouchStart(e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }

    function handleTouchEnd(e) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                move('right');
            } else {
                move('left');
            }
        } else {
            if (deltaY > 0) {
                move('down');
            } else {
                move('up');
            }
        }
    }

    // Show game over screen
    function showGameOver() {
        gameOverOverlay.style.display = 'flex';
        updateBestScore();
    }

    // Reset the game
    function resetGame() {
        gridSize = parseInt(difficultySelector.value); 
        score = 0;
        scoreElement.textContent = score; 
        loadBestScore(); 
        gameOverOverlay.style.display = 'none'; 
        createGrid();
    }

    // Event listeners
    document.addEventListener("keydown", control);
    gridContainer.addEventListener("touchstart", handleTouchStart);
    gridContainer.addEventListener("touchend", handleTouchEnd);
    difficultySelector.addEventListener("change", resetGame);
    restartButton.addEventListener("click", resetGame);
    gameOverOverlay.addEventListener("click", resetGame); 

    loadBestScore(); 
    resetGame(); 
    window.addEventListener("resize", updateCSSVariables);
});
