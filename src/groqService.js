const API_KEY = import.meta.env.VITE_GROQ_API_KEY

async function call(model, messages, maxTokens = 500) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7 }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

function parseJSON(text) {
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

// Analyze a meal photo
export async function analyzeMeal(imageDataUrl) {
  const text = await call(
    'meta-llama/llama-4-scout-17b-16e-instruct',
    [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text: 'Analyze this meal. Return ONLY JSON: {"name": "meal name", "kcal": 500, "co2_kg": 1.2, "note": "brief explanation"}' },
      ],
    }],
    300
  )
  return parseJSON(text)
}

// Correct an estimate based on user feedback
export async function correctMeal(estimate, correction) {
  const text = await call(
    'llama-3.3-70b-versatile',
    [{
      role: 'user',
      content: `Meal estimate: ${JSON.stringify(estimate)}\nUser says: "${correction}"\nAdjust and return ONLY JSON: {"name": "...", "kcal": 0, "co2_kg": 0.0, "note": "..."}`,
    }],
    300
  )
  return parseJSON(text)
}

// Generate recipe suggestions based on goals and today's meals
export async function generateRecipes(goals, todayMeals, totalKcal, totalCO2) {
  const kcalLeft = goals.kcal - totalKcal
  const co2Left = goals.co2 - totalCO2

  const hour = new Date().getHours()
  const mealHint = hour < 10 ? 'breakfast' : hour < 14 ? 'lunch' : hour < 17 ? 'afternoon snack' : 'dinner'

  const text = await call(
    'llama-3.3-70b-versatile',
    [{
      role: 'user',
      content: `It is ${hour}:00, so suggest 3 ${mealHint} recipes that fit the user's remaining budget for today.

- Calorie goal: ${goals.overUnder} ${goals.kcal} kcal/day (${kcalLeft > 0 ? kcalLeft + ' kcal left' : Math.abs(kcalLeft) + ' kcal over'})
- CO2 goal: under ${goals.co2} kg/day (${co2Left > 0 ? co2Left.toFixed(1) + ' kg CO₂ left' : Math.abs(co2Left).toFixed(1) + ' kg CO₂ over'})
- Already eaten today: ${todayMeals.length > 0 ? todayMeals.map(m => `${m.name} (${m.kcal} kcal, ${m.co2_kg} kg CO₂)`).join(', ') : 'nothing yet'}

Each recipe should fit within the remaining calorie and CO₂ budget. Return ONLY a JSON array: [{"name": "...", "description": "...", "kcal": 400, "co2_kg": 0.8}]`,
    }],
    600
  )
  return parseJSON(text)
}
