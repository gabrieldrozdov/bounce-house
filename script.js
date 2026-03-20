let body = document.querySelector('body');
function changeColors() {
	if (Math.random() < .5) {
		body.style.setProperty('--primary', `oklch(100% 0.25 ${Math.random()*360})`);
		body.style.setProperty('--secondary', `oklch(50% 0.25 ${Math.random()*360})`);
	} else {
		body.style.setProperty('--primary', `oklch(50% 0.25 ${Math.random()*360})`);
		body.style.setProperty('--secondary', `oklch(100% 0.25 ${Math.random()*360})`);
	}
}
changeColors();

// Map to track letters
let movement = new Map();

// Regenerate title
function regenerateTitle() {
	const artworkControlsInput = document.querySelector('.artwork-controls-input');
	const title = document.querySelector('.title');
	title.style.animationName = "";
	title.innerHTML = artworkControlsInput.value.replaceAll(' ', '&nbsp');
	generateTitle();
}

// Generate letter spans
let loop = false;
let titleBreak;
let notes = ['C','D','E','F','G','A','B'];
let accidentals = ["", "#", "b"];
let scale = [];
let synthTypes = ['sine', 'triangle', 'square', 'sawtooth'];
function generateTitle() {
	let heading = document.querySelector('.heading');
	heading.style.display = 'none';

	// Reset everything
	movement.forEach((entry) => {
        if (entry.synth) {
            entry.synth.dispose();
        }
    });
	movement.clear();
	clearTimeout(titleBreak);
	loop = false;

	// Reset pause/play button
	const artworkControlsToggle = document.querySelector('.artwork-controls-toggle');
	artworkControlsToggle.dataset.playing = true;
	artworkControlsToggle.dataset.active = 0;

	// Retrigger title animation
	const title = document.querySelector('.title');
	title.style.animation = 'none';
	title.offsetHeight;
	title.style.animation = null;

	// Generate possile notes
	scale = [];
	for (let i=0; i<4+2; i++) {
		let randomAccidental = accidentals[Math.floor(Math.random()*accidentals.length)];
		let randomNote = notes[Math.floor(Math.random()*notes.length)];
		scale.push(randomNote+randomAccidental);
	}

	// Generate letter spans and map entries
	let temp = '';
	let index = 0;
	let titleText = title.innerText;
	if (titleText == "") {
		titleText = "Barco Loudly";
	}
	for (let letter of titleText) {
		temp += `<span id="letter${index}" onmouseenter="nudgeLetter(this)">${letter}</span>`;
		let baseNote = scale[Math.floor(Math.random()*scale.length)];
		let note = baseNote+Math.floor(Math.random()*4+2);
	
		movement.set("letter"+index, {
			'directionX': Math.round(Math.random()),
			'directionY': Math.round(Math.random()),
			'posX': 0,
			'posY': 0,
			'speed': Math.random()*5+1,
			'directionRot': Math.round(Math.random()),
			'rot': 0,
			'active': false,
			'synth': new Tone.PolySynth().set({
				envelope: {
					attack: 0.1,
					decay: 0.1,
					sustain: Math.random(),
					release: Math.random()
				},
				oscillator: {
					type: synthTypes[Math.floor(Math.random()*synthTypes.length)]
				}
			}).toDestination(),
			'note': note
		});
	
		index++;
	}
	title.innerHTML = temp;
}

document.querySelector('.title').addEventListener('animationend', function() {
	if (!loop) {
		loop = true;
		lastTime = 0;
		requestAnimationFrame(animateTitle);
	}
});

// Move letters
let lastTime = 0;
function animateTitle(currentTime) {
	// Delta time in seconds
	if (!lastTime) lastTime = currentTime;
    let deltaTime = (currentTime - lastTime) / 1000; 
    lastTime = currentTime;

	// Enable pause/play button
	const artworkControlsToggle = document.querySelector('.artwork-controls-toggle');
	artworkControlsToggle.dataset.active = 1;

	const artwork = document.querySelector('.artwork');
	const titleLetters = document.querySelectorAll('.title span');
	for (let letter of titleLetters) {
		if (letter.innerText == "" || letter.innerText == " ") {
			continue
		}

		if (!loop) {
			return
		}

		const key = letter.id;
		const entry = movement.get(key);
		const directionX = entry['directionX'];
		const directionY = entry['directionY'];
		const directionRot = entry['directionRot'];
		const speed = entry['speed'] * deltaTime * 100;

		if (directionX == 0) { // left
			entry['posX'] -= speed;
		} else if (directionX == 1) { // right
			entry['posX'] += speed;
		}
		
		if (directionY == 0) { // up
			entry['posY'] -= speed;
		} else if (directionY == 1) { // down
			entry['posY'] += speed;
		}

		// Rotation
		if (directionRot == 0) { // up
			entry['rot'] -= speed;
		} else if (directionRot == 1) { // down
			entry['rot'] += speed;
		}

		// Apply settings
		letter.style.transform = `translate(${entry['posX']/20}vw, ${entry['posY']/20}vw) rotate(${entry['rot']}deg)`;

		// Detect direction change
		const artworkRect = artwork.getBoundingClientRect();
		const letterRect = letter.getBoundingClientRect();

		let activate = false;

		if (letterRect.left < artworkRect.left) {
			entry['directionX'] = 1;
			activate = true;
		} else if (letterRect.right > artworkRect.right) {
			entry['directionX'] = 0;
			activate = true;
		}

		if (letterRect.top < artworkRect.top) {
			entry['directionY'] = 1;
			activate = true;
		} else if (letterRect.bottom > artworkRect.bottom-40) {
			entry['directionY'] = 0;
			activate = true;
		}

		// Bring back into bounds if needed
        if (letterRect.left < artworkRect.left-50) {
            entry['posX'] += 20;
        } else if (letterRect.right > artworkRect.right+50) {
            entry['posX'] -= 20;
        }
        if (letterRect.top < artworkRect.top-50) {
            entry['posY'] += 20;
        } else if (letterRect.bottom > artworkRect.bottom + 10) {
            entry['posY'] -= 20;
        }

		// Play sound and style letter
		if (activate && !entry['active']) {
			entry['active'] = true;
			playSound(entry['synth'], entry['note'], entry['speed']/6);
			letter.dataset.activate = 1;
			setTimeout(() => {
				letter.dataset.activate = 0;
				entry['active'] = false;
			}, 100);
		}
	}

	if (loop) {
		requestAnimationFrame(animateTitle);
	}
}

// Hover effects for moving letters
function nudgeLetter(letter) {
	const key = letter.id;
	const entry = movement.get(key);
	const directionX = entry['directionX'];
	const directionY = entry['directionY'];
	const directionRot = entry['directionRot'];

	if (directionX == 0) {
		entry['directionX'] = 1;
	} else {
		entry['directionX'] = 0;
	}

	if (directionY == 0) {
		entry['directionY'] = 1;
	} else {
		entry['directionY'] = 0;
	}

	if (directionRot == 0) {
		entry['directionRot'] = 1;
	} else {
		entry['directionRot'] = 0;
	}

	if (Math.random() < .75) {
		entry['speed'] = Math.random()*6+1;
	} else {
		entry['speed'] = Math.random()*20+1;
	}

	// Play sound and style letter
	if (!entry['active']) {
		entry['active'] = true;
		playSound(entry['synth'], entry['note']);
		letter.dataset.activate = 1;
		setTimeout(() => {
			letter.dataset.activate = 0;
			entry['active'] = false;
		}, 100);
	}
}

// Pause/play
function toggleAnimation() {
	loop = !loop;
	const artworkControlsToggle = document.querySelector('.artwork-controls-toggle');
	artworkControlsToggle.dataset.playing = loop;
	if (loop) {
		lastTime = 0;
        requestAnimationFrame(animateTitle);
	}
}

// Mute/unmute
let muted = false;
function toggleVolume() {
	muted = !muted;
	const artworkControlsVolume = document.querySelector('.artwork-controls-volume');
	artworkControlsVolume.dataset.muted = muted;
}

// Play sound when letter activated
function playSound(synth, note, velocity) {
	if (synth.activeVoices >= 32) { 
		return
	}
	if (!muted) {
		synth.triggerAttackRelease(note, "64n", undefined, velocity);
	}
}