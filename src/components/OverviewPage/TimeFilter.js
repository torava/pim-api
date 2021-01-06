export default function TimeFilter() {
  return (
    <table className="overview-page__time-filter">
      <tr>
        <td>
          <label for="start-date">Start</label>
        </td>
        <td>
          <input
            id="start-date"
            type="date"
            defaultValue={this.state.filter.start_date}
            onBlur={event => this.setFilter('start_date', event.target.value)}/>
        </td>
      </tr>
      <tr>
        <td>
          <label for="end-date">End</label>
        </td>
        <td>
          <input
            id="end-date"
            type="date"
            defaultValue={this.state.filter.end_date}
            onBlur={event => this.setFilter('end_date', event.target.value)}/>
        </td>
      </tr>
    </table>
  );
}
