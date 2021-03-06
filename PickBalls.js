'use strict';

// * Initialize webGL and create a scene with camera and light
const canvas = document.getElementById('mycanvas');
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});
renderer.setClearColor('rgb(255, 255, 255)'); // set background color

const scene = new THREE.Scene();
const fov = 45;
const aspect = canvas.width / canvas.height;
const near = 0.1;
const far = 100;
const camera = new THREE.PerspectiveCamera( fov, aspect, near, far );
camera.position.set(8, 18, 8);
camera.lookAt(scene.position);
const light = new THREE.PointLight();
light.position.copy(camera.position.clone());
scene.add( light );
scene.add(new THREE.AmbientLight(0x606060));

// * Place balls randomly within outerRadius from center of world
const nBalls = 10;
const outerRadius = 8;
const ballMinRadius = 0.5;
const ballMaxRadius = 1.5;
const balls = [];
for (let k=1; k<=nBalls; ++k) {
  // random color
  const rdColor = new THREE.Color(Math.random(), Math.random(), Math.random());
  // random radius
  const rdRadius =
      ballMinRadius + Math.random() * (ballMaxRadius - ballMinRadius);
  // random position
  const rd = () => 2*Math.random() - 1; // just a helper function
  let rdPos;
  while (true) {
    rdPos =
        new THREE.Vector3(outerRadius*rd(), outerRadius*rd(), outerRadius*rd());
    if (rdPos.lengthSq() <= outerRadius*outerRadius) {
      break;
    }
  }

  // store all the balls within balls array
  const ball =
      new THREE.Mesh(
          new THREE.SphereBufferGeometry(rdRadius, 32, 32),
          new THREE.MeshStandardMaterial( {color: rdColor}),
      );
  ball.userData.radius = rdRadius;
  ball.position.copy(rdPos);
  scene.add(ball);
  balls.push(ball);
}

// Implement picking functionionality
canvas.addEventListener('mousedown', (event) => {
  // calculate viewport pixel position:
  const rect = canvas.getBoundingClientRect();
  const viewportPixelPositionX = event.clientX - rect.left;
  const viewportPixelPositionY = event.clientY - rect.top;

  // highlight ball if it has been picked
  balls.forEach(
      (ball) => pickBall(viewportPixelPositionX, viewportPixelPositionY, ball));
});

/**
 * Find out if a ball is picked with the mouse. It it is, set the emissive color
 * of the material equal to its color.
 *
 * @param {Number} viewportCoordinateX the viewport x-coordinate (pixel units)
 * @param {Number} viewportCoordinateY the viewport y-coordinate (pixel units)
 * @param {Object} ball a THREE.Mesh storing the ball and its radius as ball.userData.radius.
 */
function pickBall(viewportCoordinateX, viewportCoordinateY, ball) {
  // viewport coordinates should be within the canvas
  console.assert(
      viewportCoordinateX >= 0 && viewportCoordinateX <= canvas.width,
      'viewportCoordinateX=' + viewportCoordinateX,
  );
  console.assert(
      viewportCoordinateY >= 0 && viewportCoordinateY <= canvas.height,
      'viewportCoordinateY=' + viewportCoordinateY,
  );

  // Convert viewport coordinates to world coordinates
  const normalizedDeviceCoordinates =
      new THREE.Vector4(
          (viewportCoordinateX - canvas.width / 2) * 2 / canvas.width,
          (viewportCoordinateY - canvas.height / 2) * -2 / canvas.height,
          1,
          1,
      );

  const homogeneousClipSpaceCoordinates =
      normalizedDeviceCoordinates.clone().multiplyScalar(camera.far);

  const cameraSpaceCoordinates =
      homogeneousClipSpaceCoordinates.clone().applyMatrix4(
          camera.projectionMatrixInverse,
      );

  const worldSpaceCoordinates =
      cameraSpaceCoordinates.clone().applyMatrix4(camera.matrixWorld);

  // Calculate distance to vector
  const cameraToFarPlaneVector =
      new THREE.Vector3(
          worldSpaceCoordinates.x,
          worldSpaceCoordinates.y,
          worldSpaceCoordinates.z,
      ).sub(camera.position);

  const cameraToBallVector =
      new THREE.Vector3(
          ball.position.x,
          ball.position.y,
          ball.position.z,
      ).sub(camera.position);

  const distanceToBall =
      cameraToBallVector.sub(
          cameraToFarPlaneVector.multiplyScalar(
              cameraToBallVector.dot(cameraToFarPlaneVector) /
                  cameraToFarPlaneVector.lengthSq(),
          ),
      ).length();

  // Check if distance is less than ball radius
  if (distanceToBall <= ball.userData.radius) {
    // Highlight clicked ball
    ball.material.emissive = ball.material.color;

    // Calculate & print Camera Space Coordinates
    const ballCameraSpaceCoordinates =
        new THREE.Vector4(
            ball.position.x,
            ball.position.y,
            ball.position.z,
            1,
        ).applyMatrix4(camera.matrixWorldInverse);
    console.log(
        'Camera space coordinates: \n(' +
            ballCameraSpaceCoordinates.x + ', ' +
            ballCameraSpaceCoordinates.y + ', ' +
            ballCameraSpaceCoordinates.z + ')');

    // Calculate & print Normalized Device Coordinates
    const ballNormalizedDeviceCoordinates =
        ballCameraSpaceCoordinates.applyMatrix4(camera.projectionMatrix);
    ballNormalizedDeviceCoordinates.multiplyScalar(
        1 / ballNormalizedDeviceCoordinates.w);
    console.log(
        'Normalized device coordinates: \n(' +
            ballNormalizedDeviceCoordinates.x + ', ' +
            ballNormalizedDeviceCoordinates.y + ', ' +
            ballNormalizedDeviceCoordinates.z + ')');

    // Print clicked ball world space coordinates
    console.log(
        'World space coordinates: \n(' +
            ball.position.x + ', ' +
            ball.position.y + ', ' +
            ball.position.z + ')');

    // Print distance from click vector to ball
    console.log('Distance from ball to click: ' + distanceToBall);
    console.log('\n');
  }
}

// Dehighlight ball if mouse is released
canvas.addEventListener('mouseup', (event) => {
  balls.forEach((ball) => {
    ball.material.emissive = new THREE.Color('black');
  });
});

// * Render loop
const controls = new THREE.TrackballControls(camera, renderer.domElement);

/**
 * Renders three.js scene
 */
function render() {
  requestAnimationFrame(render);
  controls.update();
  renderer.render(scene, camera);
}
render();
