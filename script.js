const API_KEY = 'e3ff3ff7-1a4d-404c-8dae-40920f821fa5';

let nextBusInfo = null; // Variable to store next bus information
let nextBusDiv; // Declare nextBusDiv here

function calculateNextBus(departures) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    for (let i = 0; i < departures.length; i++) {
        const dep = departures[i];
        const cancelled = dep.getAttribute("cancelled") === "true";
        
        if (cancelled) continue;
        
        const time = dep.getAttribute("time");
        const rtTime = dep.getAttribute("rtTime");
        const [hours, minutes] = (rtTime || time).split(':').map(Number);
        const departureTime = hours * 60 + minutes;
        
        if (departureTime > currentTime) {
            const minutesUntil = departureTime - currentTime;
            const line = dep.getAttribute("line");
            return {
                minutes: minutesUntil,
                line: line,
                time: rtTime || time,
                departureTime: departureTime
            };
        }
    }
    return null;
}

function updateNextBusDisplay() {
    if (nextBusInfo) {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const departureTime = nextBusInfo.departureTime; // Store departure time in minutes

        // Calculate minutes until the next bus and round down
        const minutesUntil = Math.floor(departureTime - currentTime);
        
        // Determine the appropriate class based on the minutes left
        let timeClass = 'ok';
        if (minutesUntil < 0) {
            nextBusDiv.textContent = 'No more buses today';
            return;
        } else if (minutesUntil < 4) {
            timeClass = 'too-late';
        } else if (minutesUntil < 8) {
            timeClass = 'hurry';
        }

        // Update the display with the correct class
        nextBusDiv.innerHTML = `Next bus in <span class="time ${timeClass}">${minutesUntil}</span> minutes (Bus <span class="line">${nextBusInfo.line}</span> at ${nextBusInfo.time})`;
    }
}

async function fetchData() {
    const departuresDiv = document.getElementById('departures');
    const tripsDiv = document.getElementById('trips');
    nextBusDiv = document.getElementById('nextBus'); // Initialize nextBusDiv here
    departuresDiv.innerHTML = '<div class="departure-list">Loading departures...</div>';
    tripsDiv.innerHTML = '<div class="trip-list">Loading trips...</div>';
    nextBusDiv.textContent = 'Calculating next bus...';

    try {
        // Fetch departures
        const departureParams = new URLSearchParams({
            id: '5523',
            accessId: API_KEY
        });
        const departureUrl = `https://www.rejseplanen.dk/bin/rest.exe/departureBoard?id=${departureParams.get('id')}&accessId=${departureParams.get('accessId')}`;
        
        const departureResponse = await fetch(departureUrl, {
            headers: {
                'Accept': 'application/xml'
            }
        });

        if (!departureResponse.ok) {
            throw new Error(`HTTP error! status: ${departureResponse.status}`);
        }

        const departureData = await departureResponse.text();
        const departureParser = new DOMParser();
        const departureXmlDoc = departureParser.parseFromString(departureData, "text/xml");
        
        // Process departures
        const departures = departureXmlDoc.getElementsByTagName("Departure");
        const nextBus = calculateNextBus(departures);
        if (nextBus) {
            nextBusInfo = {
                line: nextBus.line,
                time: nextBus.time,
                departureTime: nextBus.departureTime // Store the departure time in minutes
            };
            updateNextBusDisplay(); // Initial display update
        } else {
            nextBusDiv.textContent = 'No more buses today';
        }
        
        // Calculate time until the next full minute
        const now = new Date();
        const secondsUntilNextMinute = 61 - now.getSeconds();
        const millisecondsUntilNextMinute = secondsUntilNextMinute * 1000;

        // Set a timeout to update at the start of the next minute
        setTimeout(() => {
            updateNextBusDisplay(); // Update immediately at the start of the next minute
            setInterval(updateNextBusDisplay, 60000); // Then update every minute
        }, millisecondsUntilNextMinute);
        
        let departureHtml = '<div class="departure-list">';
        const numDepartures = Math.min(8, departures.length);
        for (let i = 0; i < numDepartures; i++) {
            const dep = departures[i];
            const time = dep.getAttribute("time");
            const rtTime = dep.getAttribute("rtTime");
            const line = dep.getAttribute("line");
            const direction = dep.getAttribute("direction");
            const cancelled = dep.getAttribute("cancelled") === "true";
            
            let lineClass = 'line-other';
            if (line === '108') {
                lineClass = 'line-108';
            } else if (line === '109') {
                lineClass = 'line-109';
            }
            
            let timeDisplay = `
                <div class="time-container">
                    <div class="time">${time}</div>
                    <div class="status-labels">${rtTime ? `<span class="delayed-time">(${rtTime})</span><span class="delayed-label">DELAYED</span>` : ''}${cancelled ? `<span class="cancelled-label">CANCELLED</span>` : ''}</div>
                </div>`;
            
            departureHtml += `
                <div class="departure-item ${cancelled ? 'cancelled' : ''}">
                    ${timeDisplay}
                    <div class="line ${lineClass}">${line}</div>
                    <div class="destination">${direction}</div>
                </div>
            `;
        }
        departureHtml += '</div>';
        departuresDiv.innerHTML = departureHtml;

        // Fetch trips
        const tripParams = new URLSearchParams({
            originId: '5523',
            destId: '8600626',
            accessId: API_KEY
        });
        const tripUrl = `https://www.rejseplanen.dk/bin/rest.exe/trip?originId=${tripParams.get('originId')}&destId=${tripParams.get('destId')}&accessId=${tripParams.get('accessId')}`;
        
        const tripResponse = await fetch(tripUrl, {
            headers: {
                'Accept': 'application/xml'
            }
        });

        if (!tripResponse.ok) {
            throw new Error(`HTTP error! status: ${tripResponse.status}`);
        }

        const tripData = await tripResponse.text();
        // Process trips (add your trip processing logic here)
    } catch (error) {
        departuresDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        tripsDiv.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
}
