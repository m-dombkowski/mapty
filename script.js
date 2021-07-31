'use strict';

class Workout {
  date = new Date();
  id = Date.now() + ''.slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in m
  }

  _setDescription() {
    // prettier - ignore;
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run = new Running([50, 19], 5.2, 24, 178);
// const cycling = new Cycling([50, 19], 27, 95, 523);
// console.log(run, cycling);

// ----------------------------------------------------------
// APPLICATION ARCHITECTUR

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const closeAllWorkouts = document.querySelector('.close_workouts');
const closebtns = document.getElementsByClassName('close');

// Sortowanie

const sorting = document.querySelector('.all_sorts');
const sortingButtons = document.querySelector('.sorting_buttons');
const sortByDuration = document.querySelector('.by_duration');
const sortByDistance = document.querySelector('.by_distance');
const sortByPace = document.querySelector('.by_pace');
const sortByCadence = document.querySelector('.by_cadence');
const sortBySpeed = document.querySelector('.by_speed');
const sortByElevation = document.querySelector('.by_elevation');

class App {
  #map;
  #mapEvent;
  workouts = [];
  #mapZoomLevel = 16;
  sort = false;

  constructor() {
    // Get user's position
    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    closeAllWorkouts.addEventListener('click', this._closeAllWorkouts);

    // Sortowanie

    sorting.addEventListener('click', this._showSortingBar);
    sortByDistance.addEventListener('click', this._sortByDistance.bind(this));
    sortByDuration.addEventListener('click', this._sortByDuration.bind(this));
    sortByPace.addEventListener('click', this._sortByPace.bind(this));
    sortBySpeed.addEventListener('click', this._sortBySpeed.bind(this));
    sortByCadence.addEventListener('click', this._sortByCadence.bind(this));
    sortByElevation.addEventListener('click', this._sortByElevation.bind(this));
    for (let i = 0; i < closebtns.length; i++) {
      closebtns[i].addEventListener(
        'click',
        this._closeSpecificWorkout.bind(this)
      );
    }
  }

  _closeSpecificWorkout(event) {
    containerWorkouts.innerHTML = '';
    const workoutEL = event.target.closest('.workout');

    if (!workoutEL) return;

    const workout = this.workouts.find(
      work => work.id === workoutEL.dataset.id
    );

    let afterDeleting = this.workouts.filter(function (element) {
      return element.id !== workout.id;
    });

    afterDeleting.forEach(workout => {
      this.renderWorkout(workout);
    });

    localStorage.setItem('workouts', JSON.stringify(afterDeleting));
    location.reload();
  }

  _showSortingBar() {
    sortingButtons.classList.toggle('hidden');
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    // console.log(position);
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    // console.log(`https://www.google.pl/maps/@${latitude},${longitude}`);

    const coords = [50.0301424, 19.2374094]; //should be latitude and longitude
    // console.log(this);
    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    //   console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling click on map
    this.#map.on('click', this._showForm.bind(this));

    this.workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputCadence.value = '';
    inputDistance.value = '';
    inputDuration.value = '';
    inputElevation.value = '';

    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(event) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));

    const positiveInputs = (...inputs) => inputs.every(inp => inp > 0);

    event.preventDefault();

    // Get data from the form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // If workout running, create running obcject
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !positiveInputs(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // If workout cycling, create cycling obcject
    if (type === 'cycling') {
      const elevationGain = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevationGain) ||
        !positiveInputs(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevationGain);
    }
    // Add new object to workout array

    this.workouts.push(workout);
    // console.log(workout);

    // Render workout on map as marker
    this._renderWorkoutMarker(workout);

    // Render workout on list
    this.renderWorkout(workout);

    // Hide form + clear input fields

    this._hideForm();

    // Set local storage to all workouts

    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // this.workouts.sort(function (a, b) {
  //   return b.duration - a.duration;

  renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
      <h2 class="workout__title">${workout.description}
      <button class="close" title="Delete this workout!">&#x2702</button>
      </h2>
      <div class="workout__details">
        <span class="workout__icon">${
          workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
        }</span>
        <span class="workout__value">${workout.distance}</span>
        <span class="workout__unit">km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⏱</span>
        <span class="workout__value">${workout.duration}</span>
        <span class="workout__unit">min</span>
      </div>`;

    if (workout.type === 'running') {
      html += `<div class="workout__details">
        <span class="workout__icon">👣</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
      </li>`;
    }

    if (workout.type === 'cycling') {
      html += `   <div class="workout__details">
       <span class="workout__icon">⚡️</span>
       <span class="workout__value">${workout.speed.toFixed(1)}</span>
       <span class="workout__unit">km/h</span>
     </div>
     <div class="workout__details">
       <span class="workout__icon">🗻</span>
       <span class="workout__value">${workout.elevationGain}</span>
       <span class="workout__unit">m</span>
     </div>
       </li>`;
    }
    containerWorkouts.insertAdjacentHTML('afterbegin', html);
  }

  _moveToPopup(event) {
    const workoutEL = event.target.closest('.workout');
    // console.log(workoutEL);

    if (!workoutEL) return;

    const workout = this.workouts.find(
      work => work.id === workoutEL.dataset.id
    );
    // console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);

    if (!data) return;

    this.workouts = data;
    this.workouts.forEach(work => {
      this.renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _closeAllWorkouts() {
    localStorage.removeItem('workouts');
    form.innerHTML = '';
    location.reload();
  }

  _sortByDistance() {
    containerWorkouts.innerHTML = '';

    this.workouts = this.sort
      ? this.workouts.slice().sort((a, b) => b.distance - a.distance)
      : this.workouts.slice().sort((a, b) => a.distance - b.distance);

    this.workouts.forEach(workout => {
      this.renderWorkout(workout);
    });

    this.sort = !this.sort;
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _sortByDuration() {
    containerWorkouts.innerHTML = '';
    this.workouts = this.sort
      ? this.workouts.sort(
          (a, b) =>
            // a.duration > b.duration ? -1 : b.duration > a.duration ? 1 : 0 // tak tez dziala!
            b.duration - a.duration
        )
      : this.workouts.sort((a, b) => a.duration - b.duration);

    console.log(this.workouts);

    // if (containerWorkouts) {
    //   while (containerWorkouts.firstChild) {
    //     containerWorkouts.removeChild(containerWorkouts.firstChild);
    //   }
    // }    ALBO TA PETLA ALBO TEN INNERHTML NA POCZATKU FUNKCJI
    this.workouts.forEach(workout => {
      this.renderWorkout(workout);
    });

    this.sort = !this.sort;
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _sortByPace() {
    containerWorkouts.innerHTML = '';
    this.workouts = this.sort
      ? this.workouts.sort((a, b) => b.pace - a.pace)
      : this.workouts.sort((a, b) => a.pace - b.pace);

    this.workouts.forEach(workout => {
      this.renderWorkout(workout);
    });

    this.sort = !this.sort;
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _sortByCadence() {
    containerWorkouts.innerHTML = '';

    this.workouts = this.sort
      ? this.workouts.slice().sort((a, b) => b.cadence - a.cadence)
      : this.workouts.sort((a, b) => a.cadence - b.cadence);

    this.workouts.forEach(workout => {
      this.renderWorkout(workout);
    });

    this.sort = !this.sort;
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _sortBySpeed() {
    containerWorkouts.innerHTML = '';

    this.workouts = this.sort
      ? this.workouts.slice().sort((a, b) => b.speed - a.speed)
      : this.workouts.slice().sort((a, b) => a.speed - b.speed);

    this.workouts.forEach(workout => {
      this.renderWorkout(workout);
    });

    this.sort = !this.sort;
    localStorage.setItem('workouts', JSON.stringify(this.workouts));
  }

  _sortByElevation() {
    containerWorkouts.innerHTML = '';

    this.workouts = this.sort
      ? this.workouts.slice().sort((a, b) => b.elevationGain - a.elevationGain)
      : this.workouts.slice().sort((a, b) => a.elevationGain - b.elevationGain);

    this.workouts.forEach(workout => {
      this.renderWorkout(workout);
    });

    this.sort = !this.sort;
    localStorage.setItem('workouts', JSON.stringify(this.workouts));

    console.log('Test 123');
  }
}

const app = new App();

// i'd like to commit this please
