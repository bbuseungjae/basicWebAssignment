import axios from '../node_modules/axios';

document.addEventListener('DOMContentLoaded', () => {

    const form = document.querySelector('.form-data');
    const region1 = document.querySelector('.region-name1');
    const region2 = document.querySelector('.region-name2');
    const region3 = document.querySelector('.region-name3');
    const apiKey = document.querySelector('.api-key');

    const errors = document.querySelector('.errors');
    const loading = document.querySelector('.loading');
    const results = document.querySelector('.result'); 
    const resultContainer = document.querySelector('.result-container');

    const usage1 = document.querySelector('.carbon-usage1');
    const fossilfuel1 = document.querySelector('.fossil-fuel1');
    const myregion1 = document.querySelector('.my-region1');

    const usage2 = document.querySelector('.carbon-usage2');
    const fossilfuel2 = document.querySelector('.fossil-fuel2');
    const myregion2 = document.querySelector('.my-region2');

    const usage3 = document.querySelector('.carbon-usage3');
    const fossilfuel3 = document.querySelector('.fossil-fuel3');
    const myregion3 = document.querySelector('.my-region3');

    const clearBtn = document.querySelector('.clear-btn');

    const calculateColor = (value) => {
        let co2Scale = [0, 150, 600, 750, 800];
        let colors = ['#2AA364', '#F5EB4D', '#9E4229', '#381D02', '#381D02'];
        let closestNum = co2Scale.sort((a, b) => {
            return Math.abs(a - value) - Math.abs(b - value);
        })[0];
        let num = (element) => element > closestNum;
        let scaleIndex = co2Scale.findIndex(num);
        let closestColor = colors[scaleIndex];
        chrome.runtime.sendMessage({ action: 'updateIcon', value: { color: closestColor } });
    };

    const fetchCarbonUsage = async (apiKey, region) => {
        const response = await axios.get('https://api.electricitymaps.com/v3/carbon-intensity/latest', {
            params: { zone: region },
            headers: { 'auth-token': apiKey },
        });
        return response.data;
    };

    async function setUpUser(apiKey, regionName1, regionName2, regionName3) {
        localStorage.setItem('apiKey', apiKey);
        localStorage.setItem('regionName1', regionName1);
        localStorage.setItem('regionName2', regionName2);
        localStorage.setItem('regionName3', regionName3);
        
        loading.style.display = 'block';
        errors.textContent = '';
        clearBtn.style.display = 'block';
        form.style.display = 'none';
        resultContainer.style.display = 'none'; 

        const allResults = await Promise.allSettled([
            fetchCarbonUsage(apiKey, regionName1),
            fetchCarbonUsage(apiKey, regionName2),
            fetchCarbonUsage(apiKey, regionName3)
        ]);

        loading.style.display = 'none'; 
        resultContainer.style.display = 'block'; 

        let hasError = false;
        let firstSuccessfulCO2 = null;

        if (allResults[0].status === 'fulfilled') {
            const data = allResults[0].value;
            myregion1.textContent = regionName1;
            usage1.textContent = Math.round(data.carbonIntensity) + ' g CO2/kWh';
            fossilfuel1.textContent = 'N/A';
            if (firstSuccessfulCO2 === null) firstSuccessfulCO2 = data.carbonIntensity;
        } else {
            myregion1.textContent = regionName1;
            usage1.textContent = 'Failed';
            fossilfuel1.textContent = 'Failed';
            hasError = true;
        }

        if (allResults[1].status === 'fulfilled') {
            const data = allResults[1].value;
            myregion2.textContent = regionName2;
            usage2.textContent = Math.round(data.carbonIntensity) + ' g CO2/kWh';
            fossilfuel2.textContent = 'N/A';
            if (firstSuccessfulCO2 === null) firstSuccessfulCO2 = data.carbonIntensity;
        } else {
            myregion2.textContent = regionName2;
            usage2.textContent = 'Failed';
            fossilfuel2.textContent = 'Failed';
            hasError = true;
        }

        if (allResults[2].status === 'fulfilled') {
            const data = allResults[2].value;
            myregion3.textContent = regionName3;
            usage3.textContent = Math.round(data.carbonIntensity) + ' g CO2/kWh';
            fossilfuel3.textContent = 'N/A';
            if (firstSuccessfulCO2 === null) firstSuccessfulCO2 = data.carbonIntensity;
        } else {
            myregion3.textContent = regionName3;
            usage3.textContent = 'Failed';
            fossilfuel3.textContent = 'Failed';
            hasError = true;
        }

        if (hasError) {
            errors.textContent = 'Sorry, we have no data for one or more regions requested.';
        }

        if (firstSuccessfulCO2 !== null) {
            calculateColor(firstSuccessfulCO2);
        }
    }

    function handleSubmit(e) {
        e.preventDefault(); 
        setUpUser(apiKey.value, region1.value, region2.value, region3.value);
    }

    function init() {
        const storedApiKey = localStorage.getItem('apiKey');
        const storedRegion1 = localStorage.getItem('regionName1');
        const storedRegion2 = localStorage.getItem('regionName2');
        const storedRegion3 = localStorage.getItem('regionName3');

        if (storedApiKey === null || storedRegion1 === null || storedRegion2 === null || storedRegion3 === null) {
            form.style.display = 'block';
            results.style.display = 'none'; 
            loading.style.display = 'none';
            clearBtn.style.display = 'none';
            errors.textContent = '';
        } else {
            results.style.display = 'block'; 
            setUpUser(storedApiKey, storedRegion1, storedRegion2, storedRegion3);
        }

        chrome.runtime.sendMessage({
            action: 'updateIcon',
            value: { color: 'green' },
        });
    };

    function reset(e) {
        e.preventDefault();
        localStorage.removeItem('regionName1');
        localStorage.removeItem('regionName2');
        localStorage.removeItem('regionName3');
        localStorage.removeItem('apiKey');
        init();
    }

    form.addEventListener('submit', (e) => handleSubmit(e));
    clearBtn.addEventListener('click', (e) => reset(e));

    init();

});