import { Check } from 'lucide-react'

function Stepper({ steps, currentStep }) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const isCompleted = stepNumber < currentStep
        const isActive = stepNumber === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={step.id || index} className="flex items-center flex-1">
            {/* Step circle */}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-300 border-2
                  ${isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isActive
                    ? 'bg-transparent border-primary text-primary'
                    : 'bg-transparent border-secondary-400 text-secondary-700'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </div>
              <div className="flex flex-col items-center">
                <span
                  className={`text-xs font-semibold whitespace-nowrap ${
                    isActive ? 'text-primary' : isCompleted ? 'text-secondary-950' : 'text-secondary-700'
                  }`}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-[10px] text-secondary-700 whitespace-nowrap hidden sm:block">
                    {step.description}
                  </span>
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-3 mb-5">
                <div
                  className={`h-px transition-all duration-500 ${
                    isCompleted ? 'bg-primary' : 'bg-secondary-400'
                  }`}
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default Stepper