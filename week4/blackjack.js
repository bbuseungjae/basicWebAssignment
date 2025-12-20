const cardValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11]; //11 == A

function getRandomCard() {
    const randomIndex = Math.floor(Math.random() * cardValues.length);
    return cardValues[randomIndex];
}

function calculateHandSum(hand) {
    let sum = hand.reduce((a, b) => a + b, 0);
    let aceCount = hand.filter(card => card === 11).length;

    while (sum > 21 && aceCount > 0) {
        sum -= 10;
        aceCount--;
    }
    return sum;
}

let playerHand = [getRandomCard(), getRandomCard()];
let dealerHand = [getRandomCard(), getRandomCard()];

if (Math.random() > 0.5) {
    playerHand.push(getRandomCard());
}

let initialDealerSum = calculateHandSum(dealerHand);

while (initialDealerSum < 17) {
    dealerHand.push(getRandomCard());
    initialDealerSum = calculateHandSum(dealerHand);
}

let playerSum = calculateHandSum(playerHand);
let dealerSum = calculateHandSum(dealerHand);

console.log(`플레이어 카드: ${playerHand.join(', ')} (합계: ${playerSum})`);
console.log(`딜러 카드: ${dealerHand.join(', ')} (합계: ${dealerSum})`);

if (playerSum > 21) {
    console.log('You lost');
} else if (dealerSum > 21) {
    console.log('You win');
} else if (playerSum === 21) {
    if (dealerSum === 21) {
        console.log('Draw');
    } else {
        console.log('You win');
    }
} else if (dealerSum === 21) {
    console.log('Bank wins');
} else {
    if (playerSum > dealerSum) {
        console.log('You win');
    } else if (playerSum < dealerSum) {
        console.log('Bank wins');
    } else {
        console.log('Draw');
    }
}