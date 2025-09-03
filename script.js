const dateSection = document.getElementById('date-section');

function getOrdinalSuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function updateDate() {
  const now = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "April", "May", "June",
                  "July", "Aug", "Sept", "Oct", "Nov", "Dec"];

  const dayName = days[now.getDay()];
  const monthName = months[now.getMonth()];
  const date = now.getDate();
  const year = now.getFullYear();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const suffix = getOrdinalSuffix(date);

  dateSection.innerHTML = `${dayName}, ${monthName} ${date}${suffix}, ${year} ${hours}:${minutes}`;
}

setInterval(updateDate, 60000);
updateDate();

document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById('myChart').getContext('2d');
  const foodList = document.getElementById('foodList');
  const addEntryBtn = document.getElementById('addEntryBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const mealFilterBtns = document.querySelectorAll('.meal-btn');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner'];
  let allEntries = JSON.parse(localStorage.getItem('entries')) || [];
  let foodCache = JSON.parse(localStorage.getItem('foodCache')) || {};

  // Chart 
  const data = {
    labels: daysOfWeek,
    datasets: mealTypes.map((meal, index) => ({
      label: meal,
      data: daysOfWeek.map(() => 0),
      backgroundColor: ['#EF5350', '#FFCA28', '#42A5F5'][index]
    }))
  };

 const config = {
  type: 'bar',
  data: data,
  options: {
    responsive: true,
    scales: {
      x: {
        stacked: true,
        ticks: { color: "white" },
        grid: { color: "#666" },
        title: {
          display: true,
          text: "Days of the Week",
          color: "white",
          font: {
            size: 14,
            weight: "bold",
            style: "oblique"   
          }
        }
      },
      y: {
        stacked: true,
        ticks: { color: "white" },
        grid: { color: "#666" },
        title: {
          display: true,
          text: "Total Calories",
          color: "white",
          font: {
            size: 14,
            weight: "bold",
            style: "italic"
          }
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: "white"
        }
      },
      title: {
        display: true,
        text: "Weekly Calorie Intake",
        color: "yellow", 
        font: {
          size: 20,
          weight: "bold",
          style: "oblique"      
        },
        padding: {
          top: 10,
          bottom: 20
        },
        align: "center"        
      }
    }
  }
};


  const myChart = new Chart(ctx, config);

  function generateID() {
    return Math.floor(Math.random() * 100000000);
  }

  async function fetchCalories(foodName) {
    const query = foodName.toLowerCase();
    if (foodCache[query]) return foodCache[query];

    const APP_ID = "a99bf1be";  
    const API_KEY = "5d792e4e327601202cd2c7f88898b620";


    try {
      const response = await fetch("https://trackapi.nutritionix.com/v2/natural/nutrients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-id": APP_ID,
          "x-app-key": API_KEY
        },
        body: JSON.stringify({ query: foodName })
      });

      if (!response.ok) throw new Error("Food not found");
      const data = await response.json();

      if (data.foods && data.foods.length > 0) {
        const foodData = {
          calories: Math.round(data.foods[0].nf_calories),
          category: data.foods[0].food_name
        };

        foodCache[query] = foodData;
        localStorage.setItem("foodCache", JSON.stringify(foodCache));
        return foodData;
      } else {
        throw new Error("No food data available");
      }
    } catch (error) {
      alert(error.message);
      return null;
    }
  }

  function updateChart() {
    const mealTotals = mealTypes.map(meal => {
      return daysOfWeek.map(day => {
        return allEntries
          .filter(entry => entry.meal === meal && entry.day === day)
          .reduce((sum, entry) => sum + entry.calories, 0);
      });
    });

    myChart.data.datasets.forEach((dataset, i) => {
      dataset.data = mealTotals[i];
    });

    myChart.update();
  }

  function addFoodToTable(entry) {
    const row = document.createElement('tr');
    row.setAttribute('data-id', entry.id);

    row.innerHTML = `
      <td>${entry.day}</td>
      <td>${entry.food}</td>
      <td>${entry.meal}</td>
      <td>${entry.calories}</td>
      <td><button class="delete-btn"><i class="fas fa-trash"></i></button></td>
    `;

    foodList.appendChild(row);
  }

  function updateFoodListDOM(filter = "All") {
    foodList.innerHTML = '';
    allEntries
      .filter(entry => filter === "All" || entry.meal === filter)
      .forEach(addFoodToTable);
  }

  function removeFoodFromList(id) {
    allEntries = allEntries.filter(entry => entry.id !== id);
    localStorage.setItem("entries", JSON.stringify(allEntries));
    updateFoodListDOM(getActiveFilter());
    updateChart();
  }

  function getActiveFilter() {
    return document.querySelector(".meal-btn.active").dataset.meal;
  }

  foodList.addEventListener('click', (e) => {
    if (e.target.closest('.delete-btn')) {
      const row = e.target.closest('tr');
      const id = parseInt(row.getAttribute('data-id'));
      removeFoodFromList(id);
    }
  });

  addEntryBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const foodText = document.getElementById('foodInput').value.trim();
    const mealType = document.getElementById('mealType').value;
    const dayOfWeek = document.getElementById('dayOfWeek').value;

    if (!foodText) {
      alert("Please enter a food name");
      return;
    }

    const foodData = await fetchCalories(foodText);

    if (foodData) {
      const newEntry = {
        id: generateID(),
        food: foodText,
        calories: foodData.calories,
        meal: mealType,
        day: dayOfWeek
      };

      allEntries.push(newEntry);
      localStorage.setItem("entries", JSON.stringify(allEntries));

      addFoodToTable(newEntry);
      updateChart();

      document.getElementById('foodInput').value = '';
    }
  });

  // Clearing
  clearAllBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all entries?")) {
      allEntries = [];
      foodCache = {};
      localStorage.removeItem("entries");
      localStorage.removeItem("foodCache");
      updateFoodListDOM();
      updateChart();
    }
  });

// filter buttons
  mealFilterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelector(".meal-btn.active").classList.remove("active");
      btn.classList.add("active");
      updateFoodListDOM(getActiveFilter());
    });
  });


  updateFoodListDOM();
  updateChart();
});


