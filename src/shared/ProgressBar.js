import { Component } from 'react';
import React from 'react';
import './ProgressBar.css';
import PropTypes from 'prop-types';

class ProgressBar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      value: this.props.value - this.props.min,
      max: this.props.max - this.props.min,
      lastMax: this.props.max
    };

    this.progressBar = React.createRef();
  }

  render() {
    return (
      <progress
        className="ProgressBar"
        max={this.state.max}
        value={this.state.value}
        ref={this.progressBar}
      />
    );
  }

  componentDidMount = () => {
    const delay = 300;
    const increment = this.props.increment;
    if (increment) {
      setTimeout(() => {
        this.setState({
          value: this.state.value + increment
        });
      }, delay);
    }
  };

  componentDidUpdate = () => {
    if (this.state.lastMax !== this.props.max) {
      this.progressBar.current.classList.add('notransition');
      this.progressBar.current.value = 0;
      setTimeout(() => {
        this.progressBar.current.classList.remove('notransition');
        this.setState({
          value: this.props.value - this.props.min,
          max: this.props.max - this.props.min,
          lastMax: this.props.max
        });
      }, 10);
    }
  };
}

ProgressBar.propTypes = {
  value: PropTypes.number.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  increment: PropTypes.number
};

export default ProgressBar;
