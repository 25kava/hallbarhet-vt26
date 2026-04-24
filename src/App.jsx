import { useState, useEffect } from 'react'
import Arc from './Arc.jsx'
import MealModal from './MealModal.jsx'
import { generateRecipes } from './groqService.js'
import './App.css'

function App() {

  // Onboarding state
  const [hasSetName, setHasSetName] = useState(false)
  const [hasSetGoals, setHasSetGoals] = useState(false)
  const [goalStep, setGoalStep] = useState(1)

  const [name, setName] = useState('')
  const [overUnder, setOverUnder] = useState('Over')
  const [kcal, setKcal] = useState(0)
  const [CO2, setCO2] = useState(0)

  // App state
  const [activeTab, setActiveTab] = useState('home')
  const [meals, setMeals] = useState([])
  const [showMealModal, setShowMealModal] = useState(false)

  // Recipe state
  const [recipes, setRecipes] = useState([])
  const [loadingRecipes, setLoadingRecipes] = useState(false)
  const [recipeError, setRecipeError] = useState(null)

  // Streak state
  const [kcalStreak, setKcalStreak] = useState({ count: 0, lastSuccessDate: null })
  const [co2Streak, setCo2Streak] = useState({ count: 0, lastSuccessDate: null })

  // Computed: today's totals
  const today = new Date().toDateString()
  const todayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === today)
  const totalKcalToday = todayMeals.reduce((sum, m) => sum + Number(m.kcal), 0)
  const totalCO2Today = todayMeals.reduce((sum, m) => sum + Number(m.co2_kg), 0)

  // Computed: history (last 7 days)
  const historyData = [...Array(7)].map((_, i) => {
    const now = new Date()
    const monday = new Date(now)
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1 // 0=Mon offset
    monday.setDate(now.getDate() - day)
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dayMeals = meals.filter(m => new Date(m.timestamp).toDateString() === d.toDateString())
    const dayKcal = dayMeals.reduce((sum, m) => sum + Number(m.kcal), 0)
    const dayCO2 = dayMeals.reduce((sum, m) => sum + Number(m.co2_kg), 0)
    return {
      label: d.toLocaleDateString('en', { weekday: 'short' }),
      dateStr: d.toDateString(),
      kcalPct: Number(kcal) > 0 ? Math.min(dayKcal / Number(kcal), 1.3) : 0,
      co2Pct: Number(CO2) > 0 ? Math.min(dayCO2 / Number(CO2), 1.3) : 0,
    }
  })

  function addMeal(meal) {
    const newMeals = [...meals, meal]
    setMeals(newMeals)
    setShowMealModal(false)
    updateStreaks(newMeals)
  }

  // Immediate streak update — only for 'Over' kcal goal
  function updateStreaks(newMeals) {
    if (overUnder !== 'Over') return
    const today = new Date().toDateString()
    const todayMeals = newMeals.filter(m => new Date(m.timestamp).toDateString() === today)
    const totalKcal = todayMeals.reduce((sum, m) => sum + Number(m.kcal), 0)
    if (totalKcal >= Number(kcal) && kcalStreak.lastSuccessDate !== today) {
      setKcalStreak(prev => ({ count: prev.count + 1, lastSuccessDate: today }))
    }
  }

  // Midnight streak check — for 'Under' kcal and CO₂
  useEffect(() => {
    const now = new Date()
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
    const ms = midnight - now

    const timer = setTimeout(() => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toDateString()
      const yMeals = meals.filter(m => new Date(m.timestamp).toDateString() === yStr)
      const yKcal = yMeals.reduce((sum, m) => sum + Number(m.kcal), 0)
      const yCO2 = yMeals.reduce((sum, m) => sum + Number(m.co2_kg), 0)

      if (overUnder === 'Under') {
        if (yKcal <= Number(kcal)) {
          setKcalStreak(prev => prev.lastSuccessDate === yStr ? prev : { count: prev.count + 1, lastSuccessDate: yStr })
        } else {
          setKcalStreak({ count: 0, lastSuccessDate: null })
        }
      }

      if (yCO2 <= Number(CO2)) {
        setCo2Streak(prev => prev.lastSuccessDate === yStr ? prev : { count: prev.count + 1, lastSuccessDate: yStr })
      } else {
        setCo2Streak({ count: 0, lastSuccessDate: null })
      }
    }, ms)

    return () => clearTimeout(timer)
  }, [meals, kcal, CO2, overUnder])

  async function handleGenerateRecipes() {
    setLoadingRecipes(true)
    setRecipeError(null)
    try {
      const result = await generateRecipes(
        { overUnder, kcal: Number(kcal), co2: Number(CO2) },
        todayMeals,
        totalKcalToday,
        totalCO2Today
      )
      setRecipes(result)
    } catch (err) {
      setRecipeError('Could not generate recipes. Try again.')
      console.error(err)
    }
    setLoadingRecipes(false)
  }

  // Step 1: name
  if (!hasSetName) {
    return (
      <div className='onboarding'>
        <h1 className='onboarding-title'>👋 Hello!</h1>
        <p className='onboarding-subtitle'>What's your name?</p>
        <input
          className='onboarding-input'
          placeholder='John / Jane Doe'
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name !== '' && setHasSetName(true)}
        />
        <button
          className='onboarding-button'
          onClick={() => setHasSetName(true)}
          disabled={name == ''}>
          Continue →
        </button>
      </div>
    )
  }

  // Step 2: goals
  else if (!hasSetGoals) {
    return (
      <div className='onboarding'>
        <h1 className='onboarding-title'>Hi, {name}! 🎯</h1>
        <p className='onboarding-subtitle'>Let's set your daily goals</p>

        {/* Goal step 1: over/under */}
        {goalStep === 1 && (
          <div>
            <div className='goal-row'>
              <p className='goal-unit'>I want to stay</p>
              <select
                className='onboarding-select'
                onChange={(e) => setOverUnder(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setGoalStep(2)}
              >
                <option>Over</option>
                <option>Under</option>
              </select>
              <p className='goal-unit'>my calorie goal</p>
            </div>
            <button className='onboarding-button' onClick={() => setGoalStep(2)}>
              Next →
            </button>
          </div>
        )}

        {/* Goal step 2: kcal */}
        {goalStep === 2 && (
          <div>
            <div className='goal-row'>
              <p className='goal-unit'>{overUnder}</p>
              <input
                className='onboarding-input-small'
                type='number'
                placeholder='e.g. 2000'
                autoFocus
                onChange={(e) => setKcal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && kcal > 0 && setGoalStep(3)}
              />
              <p className='goal-unit'>kcal / day</p>
            </div>
            <button className='onboarding-button' onClick={() => setGoalStep(3)} disabled={kcal <= 0}>
              Next →
            </button>
          </div>
        )}

        {/* Goal step 3: CO2 */}
        {goalStep === 3 && (
          <div>
            <div className='goal-row'>
              <p className='goal-unit'>Under</p>
              <input
                className='onboarding-input-small'
                type='number'
                placeholder='e.g. 5'
                autoFocus
                onChange={(e) => setCO2(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && CO2 > 0 && setHasSetGoals(true)}
              />
              <p className='goal-unit'>kg CO² / day</p>
            </div>
            <button
              className='onboarding-button'
              onClick={() => setHasSetGoals(true)}
              disabled={CO2 <= 0}>
              Let's start tracking!
            </button>
          </div>
        )}

      </div>
    )
  }

  // Step 3: main app
  const kcalPct = Number(kcal) > 0 ? Math.min((totalKcalToday / Number(kcal)) * 100, 100) : 0
  const kcalDiff = Number(kcal) - totalKcalToday
  const kcalLabel = overUnder === 'Under'
    ? kcalDiff >= 0 ? `${kcalDiff} kcal to spare` : `${Math.abs(kcalDiff)} kcal over goal!`
    : kcalDiff <= 0 ? `Goal reached! ${Math.abs(kcalDiff)} kcal over` : `${kcalDiff} kcal to reach goal`

  return (
    <div className='app'>

      {/* ── Home tab ── */}
      {activeTab === 'home' && (
        <div className='tab-content'>
          <h1 className='home-title'>Welcome, {name}!</h1>

          {/* Streaks */}
          <div className='streaks-row'>
            <div className='streak-badge'>
              <span className='streak-icon'>🔥</span>
              <span className='streak-count'>{kcalStreak.count}</span>
              <span className='streak-label'>kcal streak</span>
            </div>
            <div className='streak-badge'>
              <span className='streak-icon'>🌱</span>
              <span className='streak-count'>{co2Streak.count}</span>
              <span className='streak-label'>CO₂ streak</span>
            </div>
          </div>

          {/* CO2 arc */}
          <Arc value={totalCO2Today} max={Number(CO2)} />

          {/* Calorie bar */}
          <div className='kcal-bar-wrap'>
            <p className='kcal-bar-label'>🔥 {kcalLabel}</p>
            <div className='kcal-bar-track'>
              <div className='kcal-bar-fill' style={{ width: `${kcalPct}%` }} />
            </div>
          </div>

          {/* Today's meals */}
          <div className='meals-section'>
            <h2 className='meals-title'>Today's meals</h2>
            {todayMeals.length === 0
              ? <p className='empty-hint'>No meals logged yet</p>
              : todayMeals.map(meal => (
                <div key={meal.id} className='meal-card'>
                  {meal.imageUrl && <img src={meal.imageUrl} alt={meal.name} className='meal-thumb' />}
                  <div className='meal-info'>
                    <p className='meal-name'>{meal.name}</p>
                    <p className='meal-stats'>🔥 {meal.kcal} kcal &nbsp; 🌱 {meal.co2_kg} kg CO₂</p>
                  </div>
                </div>
              ))
            }
            <button className='log-btn' onClick={() => setShowMealModal(true)}>+ Log a meal</button>
          </div>
        </div>
      )}

      {/* ── Recipes tab ── */}
      {activeTab === 'recipes' && (
        <div className='tab-content'>
          <h1 className='home-title'>Recipes 🥗</h1>
          <p className='tab-subtitle'>Based on your goals and what you've eaten today</p>

          {/* Current goals */}
          <div className='goals-summary'>
            <div className='goal-chip'>🔥 {overUnder} {kcal} kcal / day</div>
            <div className='goal-chip'>🌱 Under {CO2} kg CO₂ / day</div>
          </div>

          <button className='generate-btn' onClick={handleGenerateRecipes} disabled={loadingRecipes}>
            {loadingRecipes ? 'Generating...' : '✨ Generate suggestions'}
          </button>

          {recipeError && <p className='error-text'>{recipeError}</p>}

          {loadingRecipes && <div className='spinner' />}

          {recipes.map((r, i) => (
            <div key={i} className='recipe-card'>
              <h3 className='recipe-name'>{r.name}</h3>
              <p className='recipe-desc'>{r.description}</p>
              <div className='recipe-stats'>
                <span>🔥 {r.kcal} kcal</span>
                <span>🌱 {r.co2_kg} kg CO₂</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── History tab ── */}
      {activeTab === 'history' && (
        <div className='tab-content'>
          <h1 className='home-title'>History 📈</h1>
          <p className='tab-subtitle'>Last 7 days — blue is calories, green is CO₂</p>

          <svg viewBox='0 0 280 150' width='310' className='history-chart'>
            <defs>
              <linearGradient id='kcalGrad' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#42a5f5' />
                <stop offset='100%' stopColor='#90caf9' />
              </linearGradient>
              <linearGradient id='co2Grad' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0%' stopColor='#4caf50' />
                <stop offset='100%' stopColor='#a5d6a7' />
              </linearGradient>
            </defs>

            {/* Kcal goal line */}
            <line x1='8' y1='18' x2='260' y2='18' stroke='#42a5f5' strokeDasharray='5,3' strokeWidth='1.5' opacity='0.5' />
            <text x='263' y='21' fontSize='7' fill='#42a5f5' fontWeight='600'>kcal</text>

            {/* CO2 goal line */}
            <line x1='8' y1='25' x2='260' y2='25' stroke='#4caf50' strokeDasharray='5,3' strokeWidth='1.5' opacity='0.5' />
            <text x='263' y='28' fontSize='7' fill='#4caf50' fontWeight='600'>CO₂</text>

            {historyData.map((d, i) => {
              const cx = 18 + i * 36
              const maxH = 90
              const kcalH = Math.max(d.kcalPct * maxH, d.kcalPct > 0 ? 4 : 0)
              const co2H = Math.max(d.co2Pct * maxH, d.co2Pct > 0 ? 4 : 0)
              const isToday = d.dateStr === today
              return (
                <g key={i}>
                  {/* kcal bar */}
                  <rect x={cx} y={112 - kcalH} width='13' height={kcalH} fill='url(#kcalGrad)' rx='4' />

                  {/* CO2 bar */}
                  <rect x={cx + 15} y={112 - co2H} width='13' height={co2H} fill='url(#co2Grad)' rx='4' />

                  {/* Day label */}
                  <text x={cx + 13} y='128' textAnchor='middle' fontSize='9' fill={isToday ? '#333' : '#bbb'} fontWeight={isToday ? '700' : '400'} >
                    {d.label}
                  </text>
                </g>
              )
            })}
          </svg>

          <div className='chart-legend'>
            <div className='legend-item'>
              <span className='legend-dot blue' />
              <span>Calories</span>
            </div>
            <div className='legend-item'>
              <span className='legend-dot green' />
              <span>CO₂</span>
            </div>
          </div>
        </div>
      )}

      {/* Meal modal */}
      {showMealModal && <MealModal onSave={addMeal} onClose={() => setShowMealModal(false)} />}

      {/* Floating island tab bar — History | Home | Recipes */}
      <nav className='tab-bar'>
        <button className={activeTab === 'history' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('history')}>
          <span>📈</span>
          <span>History</span>
        </button>
        <button className={activeTab === 'home' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('home')}>
          <span>🏠</span>
          <span>Home</span>
        </button>
        <button className={activeTab === 'recipes' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('recipes')}>
          <span>🥗</span>
          <span>Recipes</span>
        </button>
      </nav>

    </div>
  )
}

export default App
