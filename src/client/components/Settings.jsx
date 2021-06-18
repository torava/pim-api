import React from 'react';

export function Settings({
  currency,
  onCurrencyChange,
  locale,
  onLocaleChange,
  attributeUnits,
  onEnergyUnitChange,
  format,
  onFormatChange,
  pipeline,
  onCropChange
}) {
  return (
    <>
      <p>
        <select 
          id="currency"
          placeholder="Currency"
          value={currency}
          onChange={onCurrencyChange.bind(this)}>
          <option value="EUR">EUR</option>
          <option value="SEK">SEK</option>
          <option value="USD">USD</option>
          <option value="CAD">CAD</option>
          <option value="ARS">ARS</option>
        </select>&nbsp;
        <select
          id="locale"
          placeholder="Locale"
          value={locale}
          onChange={onLocaleChange.bind(this)}>
          <option value="fi-FI">fi-FI</option>
          <option value="sv-SV">sv-SV</option>
          <option value="en-US">en-US</option>
        </select>&nbsp;
        <select
          id="energy"
          placeholder="Energy"
          value={attributeUnits['Energy,calculated']}
          onChange={onEnergyUnitChange.bind(this)}>
          <option value="kj/hg">kJ</option>
          <option value="kcal/hg">kcal</option>
        </select>
      </p>
      <p>
        <select
          id="format"
          placeholder="Format"
          value={format}
          onChange={onFormatChange.bind(this)}>
          <option value="text/csv">CSV</option>
          <option value="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">XLSX</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={pipeline.crop}
            onChange={onCropChange.bind(this)}/>
          Crop
        </label>
      </p>
    </>
  );
}
