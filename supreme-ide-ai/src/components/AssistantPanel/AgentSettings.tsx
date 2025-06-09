import React, { useState, useEffect } from 'react';
import styles from './AgentSettings.module.css';

export interface AgentSettingsData {
  apiKey: string;
  selectedModel: string;
  customModel: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

interface AgentSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: AgentSettingsData) => void;
  currentSettings: AgentSettingsData;
}

const PREDEFINED_MODELS = [
  { id: 'gemini-2.5-pro-preview-05-06', name: 'Gemini 2.5 Pro (Preview)', provider: 'Google', contextSize: '1M tokens' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', contextSize: '2M tokens' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'Google', contextSize: '1M tokens' },
  { id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextSize: '200K tokens' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextSize: '128K tokens' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', contextSize: '128K tokens' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', contextSize: '16K tokens' },
  { id: 'custom', name: 'Custom Model', provider: 'Custom', contextSize: 'Variable' }
];

const AgentSettings: React.FC<AgentSettingsProps> = ({ isOpen, onClose, onSave, currentSettings }) => {
  const [activeTab, setActiveTab] = useState('api');
  const [settings, setSettings] = useState<AgentSettingsData>(currentSettings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  const validateSettings = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!settings.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    }

    if (!settings.selectedModel) {
      newErrors.selectedModel = 'Please select a model';
    }

    if (settings.selectedModel === 'custom' && !settings.customModel.trim()) {
      newErrors.customModel = 'Custom model name is required';
    }

    if (settings.temperature < 0 || settings.temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2';
    }

    if (settings.maxTokens < 1 || settings.maxTokens > 100000) {
      newErrors.maxTokens = 'Max tokens must be between 1 and 100,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateSettings()) {
      onSave(settings);
      onClose();
    }
  };

  const handleInputChange = (field: keyof AgentSettingsData, value: string | number) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const selectedModelInfo = PREDEFINED_MODELS.find(m => m.id === settings.selectedModel);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.title}>
            <span className={styles.icon}>🧠</span>
            Agent AI Settings
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'api' ? styles.active : ''}`}
            onClick={() => setActiveTab('api')}
          >
            🔑 API Configuration
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'model' ? styles.active : ''}`}
            onClick={() => setActiveTab('model')}
          >
            🤖 Model Selection
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'parameters' ? styles.active : ''}`}
            onClick={() => setActiveTab('parameters')}
          >
            ⚙️ Parameters
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'api' && (
            <div className={styles.tabContent}>
              <div className={styles.section}>
                <h3>🔐 API Key Configuration</h3>
                <p className={styles.description}>
                  Your API key is stored securely in session storage and never shared.
                </p>
                
                <div className={styles.inputGroup}>
                  <label>API Key *</label>
                  <div className={styles.passwordInput}>
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.apiKey}
                      onChange={(e) => handleInputChange('apiKey', e.target.value)}
                      placeholder="Enter your API key..."
                      className={errors.apiKey ? styles.error : ''}
                    />
                    <button 
                      type="button"
                      className={styles.togglePassword}
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {errors.apiKey && <span className={styles.errorText}>{errors.apiKey}</span>}
                </div>

                <div className={styles.securityInfo}>
                  <div className={styles.securityItem}>
                    <span className={styles.checkmark}>✅</span>
                    Session-only storage (not persistent)
                  </div>
                  <div className={styles.securityItem}>
                    <span className={styles.checkmark}>✅</span>
                    Encrypted in transit (HTTPS)
                  </div>
                  <div className={styles.securityItem}>
                    <span className={styles.checkmark}>✅</span>
                    Never logged or shared
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className={styles.tabContent}>
              <div className={styles.section}>
                <h3>🤖 AI Model Selection</h3>
                <p className={styles.description}>
                  Choose your preferred AI model or enter a custom model name.
                </p>

                <div className={styles.modelGrid}>
                  {PREDEFINED_MODELS.map((model) => (
                    <div
                      key={model.id}
                      className={`${styles.modelCard} ${settings.selectedModel === model.id ? styles.selected : ''}`}
                      onClick={() => handleInputChange('selectedModel', model.id)}
                    >
                      <div className={styles.modelHeader}>
                        <span className={styles.modelName}>{model.name}</span>
                        <span className={styles.provider}>{model.provider}</span>
                      </div>
                      <div className={styles.modelContext}>{model.contextSize}</div>
                      {settings.selectedModel === model.id && (
                        <div className={styles.selectedIndicator}>✓</div>
                      )}
                    </div>
                  ))}
                </div>

                {settings.selectedModel === 'custom' && (
                  <div className={styles.inputGroup}>
                    <label>Custom Model Name *</label>
                    <input
                      type="text"
                      value={settings.customModel}
                      onChange={(e) => handleInputChange('customModel', e.target.value)}
                      placeholder="e.g., gpt-4o-mini, claude-3-opus, etc."
                      className={errors.customModel ? styles.error : ''}
                    />
                    {errors.customModel && <span className={styles.errorText}>{errors.customModel}</span>}
                  </div>
                )}

                {selectedModelInfo && (
                  <div className={styles.modelInfo}>
                    <h4>📋 Selected Model Info</h4>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoItem}>
                        <label>Model:</label>
                        <span>{selectedModelInfo.name}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <label>Provider:</label>
                        <span>{selectedModelInfo.provider}</span>
                      </div>
                      <div className={styles.infoItem}>
                        <label>Context Size:</label>
                        <span>{selectedModelInfo.contextSize}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'parameters' && (
            <div className={styles.tabContent}>
              <div className={styles.section}>
                <h3>⚙️ Generation Parameters</h3>
                <p className={styles.description}>
                  Fine-tune the AI model's behavior and output characteristics.
                </p>

                <div className={styles.parameterGrid}>
                  <div className={styles.parameterGroup}>
                    <label>
                      Temperature: {settings.temperature}
                      <span className={styles.hint}>Controls randomness (0-2)</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.temperature}
                      onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value))}
                      className={styles.slider}
                    />
                    <div className={styles.sliderLabels}>
                      <span>Precise</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div className={styles.parameterGroup}>
                    <label>
                      Max Tokens
                      <span className={styles.hint}>Maximum response length</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100000"
                      value={settings.maxTokens}
                      onChange={(e) => handleInputChange('maxTokens', parseInt(e.target.value))}
                      className={errors.maxTokens ? styles.error : ''}
                    />
                    {errors.maxTokens && <span className={styles.errorText}>{errors.maxTokens}</span>}
                  </div>

                  <div className={styles.parameterGroup}>
                    <label>
                      Top P: {settings.topP}
                      <span className={styles.hint}>Nucleus sampling (0-1)</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.topP}
                      onChange={(e) => handleInputChange('topP', parseFloat(e.target.value))}
                      className={styles.slider}
                    />
                  </div>

                  <div className={styles.parameterGroup}>
                    <label>
                      Frequency Penalty: {settings.frequencyPenalty}
                      <span className={styles.hint}>Reduce repetition (-2 to 2)</span>
                    </label>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={settings.frequencyPenalty}
                      onChange={(e) => handleInputChange('frequencyPenalty', parseFloat(e.target.value))}
                      className={styles.slider}
                    />
                  </div>

                  <div className={styles.parameterGroup}>
                    <label>
                      Presence Penalty: {settings.presencePenalty}
                      <span className={styles.hint}>Encourage new topics (-2 to 2)</span>
                    </label>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={settings.presencePenalty}
                      onChange={(e) => handleInputChange('presencePenalty', parseFloat(e.target.value))}
                      className={styles.slider}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            💾 Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentSettings; 