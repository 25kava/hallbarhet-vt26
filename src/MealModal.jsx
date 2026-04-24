import { useState } from 'react'
import { analyzeMeal, correctMeal } from './groqService'

export default function MealModal({ onSave, onClose }) {

  const [phase, setPhase] = useState('upload') // upload | analyzing | estimate
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const [estimate, setEstimate] = useState(null)
  const [correction, setCorrection] = useState('')
  const [correcting, setCorrecting] = useState(false)
  const [error, setError] = useState(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImageDataUrl(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    setPhase('analyzing')
    setError(null)
    try {
      const result = await analyzeMeal(imageDataUrl)
      setEstimate(result)
      setPhase('estimate')
    } catch (err) {
      setError('Could not analyze image. Try again.')
      setPhase('upload')
    }
  }

  async function handleCorrect() {
    if (!correction.trim()) return
    setCorrecting(true)
    try {
      const updated = await correctMeal(estimate, correction)
      setEstimate(updated)
      setCorrection('')
    } catch (err) {
      console.error(err)
    }
    setCorrecting(false)
  }

  function handleSave() {
    onSave({
      id: Date.now(),
      name: estimate.name,
      kcal: Number(estimate.kcal),
      co2_kg: Number(estimate.co2_kg),
      note: estimate.note,
      imageUrl: imageDataUrl,
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div className='modal-overlay' onClick={e => e.target === e.currentTarget && onClose()}>
      <div className='modal'>

        <div className='modal-header'>
          <h2>Log a meal</h2>
          <button className='modal-close' onClick={onClose}>✕</button>
        </div>

        {/* Phase: upload */}
        {phase === 'upload' && (
          <div className='modal-body'>
            {!imageDataUrl ? (
              <label className='upload-area'>
                <input type='file' accept='image/*' capture='environment' onChange={handleFile} />
                <span className='upload-icon'>📷</span>
                <span>Take a photo or choose from gallery</span>
              </label>
            ) : (
              <div className='image-preview-wrap'>
                <img src={imageDataUrl} alt='meal' className='meal-preview-img' />
                <button className='change-img-btn' onClick={() => setImageDataUrl(null)}>Change photo</button>
              </div>
            )}
            {error && <p className='error-text'>{error}</p>}
            {imageDataUrl && (
              <button className='onboarding-button' onClick={handleAnalyze}>Analyze with AI</button>
            )}
          </div>
        )}

        {/* Phase: analyzing */}
        {phase === 'analyzing' && (
          <div className='modal-body analyzing'>
            <img src={imageDataUrl} alt='meal' className='meal-preview-img dimmed' />
            <div className='spinner' />
            <p>Analyzing your meal...</p>
          </div>
        )}

        {/* Phase: estimate + correction */}
        {phase === 'estimate' && estimate && (
          <div className='modal-body'>
            <img src={imageDataUrl} alt='meal' className='meal-preview-small' />

            <div className='estimate-card'>
              <h3>{estimate.name}</h3>
              <div className='estimate-stats'>
                <div className='stat'>
                  <span className='stat-value'>{estimate.kcal}</span>
                  <span className='stat-label'>kcal</span>
                </div>
                <div className='stat-divider' />
                <div className='stat'>
                  <span className='stat-value'>{estimate.co2_kg}</span>
                  <span className='stat-label'>kg CO₂</span>
                </div>
              </div>
              {estimate.note && <p className='estimate-note'>{estimate.note}</p>}
            </div>

            <div className='correction-section'>
              <label>Not quite right? Tell the AI:</label>
              <div className='correction-row'>
                <input
                  type='text'
                  value={correction}
                  placeholder="e.g. It's salmon, not tuna"
                  onChange={e => setCorrection(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCorrect()}
                />
                <button onClick={handleCorrect} disabled={correcting || !correction.trim()}>
                  {correcting ? '...' : 'Fix'}
                </button>
              </div>
            </div>

            <button className='onboarding-button' onClick={handleSave}>Save meal</button>
          </div>
        )}

      </div>
    </div>
  )
}
