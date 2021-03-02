import React from 'react';

export function AttributeGoals(props) {
  const {
    attributeGoals = {},
    setAttributeGoals = () => undefined,
    selectedAttribute
  } = props;

  const setAttributeGoal = (goal) => {
    setAttributeGoals({
      ...attributeGoals,
      [selectedAttribute.id]: goal
    });
  };

  return (
    <p>
      Goal: <input
        type="number"
        value={attributeGoals[selectedAttribute.id] || 0}
        onChange={event => setAttributeGoal(event.target.value)}/>
    </p>
  );
}
