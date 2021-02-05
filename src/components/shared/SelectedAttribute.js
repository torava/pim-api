import React from 'react';

import { locale } from "../locale";

export function SelectedAttribute(props) {
  const {
    selectedAttribute
  } = props;
  return (
    <p>
      Selected: {locale.getNameLocale(selectedAttribute?.name)}
    </p>
  );
}
