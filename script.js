// --- Basic Setup ---
let scene, camera, renderer, controls, raycaster, mouse;
let currentModelGroup = null; // To hold the currently loaded model and its hotspots
const hotspots = []; // Array to store hotspot mesh objects of the CURRENT model
const container = document.getElementById('container');
const infoBox = document.getElementById('info-box');
const infoTitle = document.getElementById('info-title');
const infoContent = document.getElementById('info-content');
const closeButton = document.getElementById('close-button');
const loadingIndicator = document.getElementById('loading-indicator');
const cardSelector = document.getElementById('card-selector');
const resetButton = document.getElementById('reset-view-button'); // Get reset button

// Variables to store the initial camera state for reset
let initialCameraPosition = new THREE.Vector3();
let initialControlsTarget = new THREE.Vector3();


// --- Artifact Data ---
const artifactData = [
    {
        id: "artifact1",
        name: "Vase",
        path: "3d/object1/scene.gltf",
        centerOffset: new THREE.Vector3(0, 0, 0),
        manualScale: 1.0,
        hotspots: [
            { position: new THREE.Vector3(0, 1.2, 0), title: "Feature 1", content: "Description for feature 1 of object 1." },
            { position: new THREE.Vector3(0.8, 0, 0.8), title: "Feature 2", content: "Description for feature 2 of object 1." },
            { position: new THREE.Vector3(0, -1.0, 0), title: "Feature 3", content: "Description for feature 3 of object 1." }
        ]
    },
    {
        id: "artifact2",
        name: "Globus",
        path: "3d/object2/scene.gltf",
        centerOffset: new THREE.Vector3(0, -1, 0),
        manualScale: 1.2,
        hotspots: [
            { position: new THREE.Vector3(0, 1.5, 0.1), title: "Detail A", content: "Description for detail A of object 2." },
            { position: new THREE.Vector3(0.8, 0.8, 0.3), title: "Detail B", content: "Description for detail B of object 2." },
            { position: new THREE.Vector3(0, -1.2, 0), title: "Detail C", content: "Description for detail C of object 2." }
        ]
    },

    {
        id: "artifact3",
        name: "Bygning",
        path: "3d/object3/scene.gltf",
        centerOffset: new THREE.Vector3(0, -7, 3),
        manualScale: 8,
        hotspots: [
            { position: new THREE.Vector3(0, 1.5, 0.1), title: "Detail A", content: "Description for detail A of object 2." },
            { position: new THREE.Vector3(0.5, 0.2, 0.3), title: "Detail B", content: "Description for detail B of object 2." },
            { position: new THREE.Vector3(0, -1.2, 0), title: "Detail C", content: "Description for detail C of object 2." }
        ]
    },

    {
        id: "artifact4",
        name: "Væg",
        path: "3d/object4/scene.gltf",
        centerOffset: new THREE.Vector3(0, 3, 6),
        manualScale: 12,
        hotspots: [
            { position: new THREE.Vector3(-0.4, 2.5, 3), title: "Elefanthoved", content: "Description for detail A of object 2." },
            { position: new THREE.Vector3(8, 3, 2), title: "Detail B", content: "Description for detail B of object 2." },
            { position: new THREE.Vector3(-8, 2.5, 2), title: "Detail C", content: "Description for detail C of object 2." }
        ]
    },


];

// --- Initialization ---
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.physicallyCorrectLights = true;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444, 0.6 );
    hemiLight.position.set( 0, 20, 0 );
    scene.add( hemiLight );

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true; // Panning enabled
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI;

    // Raycasting Setup
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // --- Populate Selection Cards ---
    populateCards();

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize, false);
    container.addEventListener('pointerdown', onPointerDown, false);
    closeButton.addEventListener('click', hideInfoBox);
    resetButton.addEventListener('click', resetCameraView);
    // Card click listeners are added in populateCards()

    // --- Load Initial Model ---
    if (artifactData.length > 0) {
        loadModel(artifactData[0]); // Load the first artifact by default
    } else {
         console.warn("No artifact data provided.");
         loadingIndicator.textContent = "No artifacts defined.";
         loadingIndicator.style.display = 'block';
    }


    // Start the animation loop
    animate();
}

// --- Populate Artifact Selection Cards ---
function populateCards() {
    cardSelector.innerHTML = ''; // Clear existing cards
    artifactData.forEach(artifact => {
        const card = document.createElement('div');
        card.classList.add('artifact-card');
        card.textContent = artifact.name;
        card.dataset.id = artifact.id;

        card.addEventListener('click', () => {
            if (card.classList.contains('active')) return;
            hideInfoBox();
            loadModel(artifact);
        });

        cardSelector.appendChild(card);
    });
}

// --- Update Active Card Visual State ---
function setActiveCard(activeId) {
    const cards = cardSelector.querySelectorAll('.artifact-card');
    cards.forEach(card => {
        if (card.dataset.id === activeId) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
}


// --- Clear Current Model and Hotspots ---
function clearScene() {
    if (currentModelGroup) {
        // Dispose of geometries and materials
        currentModelGroup.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        scene.remove(currentModelGroup);
        currentModelGroup = null;
    }
    hotspots.length = 0;
    console.log("Previous model and hotspots cleared.");
}


// --- Load Selected Model ---
function loadModel(modelData) {
    clearScene();
    loadingIndicator.style.display = 'block';
    loadingIndicator.textContent = 'Loading Model...';
    setActiveCard(modelData.id);

    const loader = new THREE.GLTFLoader();

    loader.load(modelData.path,
        // --- onLoad callback ---
        (gltf) => {
            const object = gltf.scene;
            currentModelGroup = new THREE.Group();

            // --- Model adjustments ---
            // 1. Auto-center based on bounding box
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            object.position.sub(center); // Move center of bounding box to origin


            // 2. Auto-Scale the object to fit desiredSize
            const size = box.getSize(new THREE.Vector3()); // Get size BEFORE scaling
            const maxDim = Math.max(size.x, size.y, size.z);
            const desiredSize = 2.0;
            const autoScale = maxDim > 0 ? desiredSize / maxDim : 1; // Avoid division by zero
            object.scale.set(autoScale, autoScale, autoScale);
            console.log(`Applied auto-scale: ${autoScale} to ${modelData.name}`);

            // *** 3. Apply Manual Scale (if provided) ***
            const manualScaleFactor = modelData.manualScale !== undefined ? modelData.manualScale : 1.0;
            if (manualScaleFactor !== 1.0) {
                object.scale.multiplyScalar(manualScaleFactor);
                console.log(`Applied manual scale factor: ${manualScaleFactor} to ${modelData.name}`);
            } else {
                 console.log(`No manual scale factor applied to ${modelData.name}`);
            }


            // *** 4. Apply Manual Offset (AFTER scaling) ***
            if (modelData.centerOffset && modelData.centerOffset instanceof THREE.Vector3) {
                 // Apply the offset relative to the scaled, auto-centered position
                 object.position.add(modelData.centerOffset);
                 console.log(`Applied manual offset (post-scale): ${modelData.centerOffset.x}, ${modelData.centerOffset.y}, ${modelData.centerOffset.z} to ${modelData.name}`);
            } else {
                 console.log(`No manual offset applied to ${modelData.name}`);
            }
            console.log(`Final position for ${modelData.name}:`, object.position);
            console.log(`Final scale for ${modelData.name}:`, object.scale);


            currentModelGroup.add(object);

            // --- Create Hotspots ---
            // Hotspot positions are relative to the final position/scale of the object within the group
            createHotspots(modelData.hotspots);

            scene.add(currentModelGroup);

            // --- Set and Store Initial Camera/Controls State ---
            initialControlsTarget.set(0, 0, 0); // Target the final object pivot point
            // Adjust initial camera distance based on final effective size
            const finalEffectiveSize = desiredSize * manualScaleFactor;
            initialCameraPosition.set(0, finalEffectiveSize * 0.5, finalEffectiveSize * 2.5); // Slightly elevated view

            controls.target.copy(initialControlsTarget);
            camera.position.copy(initialCameraPosition);
            controls.update(); // IMPORTANT: Apply initial state

            loadingIndicator.style.display = 'none';
            console.log(`Model "${modelData.name}" loaded successfully!`);
        },
        // --- onProgress callback ---
        (xhr) => {
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            loadingIndicator.textContent = `Loading Model: ${Math.round(percentComplete)}%`;
        },
        // --- onError callback ---
        (error) => {
            console.error(`An error happened during GLTF loading for ${modelData.path}:`, error);
            loadingIndicator.textContent = 'Error loading model!';
            alert(`Error loading ${modelData.name}. Please check the file path ('${modelData.path}') and ensure a local server is running if needed.`);
            clearScene();
            setActiveCard(null);
        }
    );
}


// --- Function to Create Hotspots ---
function createHotspots(specificHotspotData) {
     const hotspotGeometry = new THREE.SphereGeometry(0.1, 16, 16); // Hotspot size is constant regardless of model scale
     const hotspotMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });

     specificHotspotData.forEach(data => {
        const hotspot = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
        // Hotspot positions are defined relative to the object's pivot point (which is now at 0,0,0)
        // These positions should be defined relative to the object's size *after* auto-scaling but *before* manual scaling.
        // Or, adjust them based on the final visual size.
        hotspot.position.copy(data.position);
        hotspot.userData = { title: data.title, content: data.content };

        if (currentModelGroup) {
             currentModelGroup.add(hotspot); // Add hotspot to the model's group
        }
        hotspots.push(hotspot); // Still need this for raycasting
    });
    console.log(`Created ${specificHotspotData.length} hotspots.`);
}

// --- Reset Camera View ---
function resetCameraView() {
    // Use the stored initial position and target
    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialControlsTarget);
    controls.update(); // Apply the reset state
    console.log("Camera view reset.");
}


// --- Handle Window Resize ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Handle Pointer Down (Click/Tap) ---
function onPointerDown(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(hotspots);

    if (intersects.length > 0) {
        const clickedHotspot = intersects[0].object;
        showInfoBox(clickedHotspot.userData);
    }
}

// --- Show/Hide Information Box ---
function showInfoBox(data) {
    infoTitle.textContent = data.title || "Details";
    infoContent.textContent = data.content || "No information available.";
    infoBox.style.display = 'block';
}
function hideInfoBox() {
    infoBox.style.display = 'none';
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Required for damping and controls processing
    renderer.render(scene, camera);
}

// --- Start Everything ---
window.onload = init;
