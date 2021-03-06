import { Component } from 'react';
import React from 'react';
import PropTypes from 'prop-types';
import SelectTree from '../select-tree/SelectTree.js';
import { labelItems, descriptionItems } from './labellingData.js';
import { CSSTransition } from 'react-transition-group';
import cloneDeep from 'lodash.clonedeep';

import './labelling.css';

class Labelling extends Component {
  static defaultProps = {
    measurementData: {},
    eventData: {},
    skipButton: false,
    editDescription: false
  };

  constructor(props) {
    super(props);
    const { measurementData, eventData } = props;

    this.state = {
      displayComponent: true,
      editDescription: props.editDescription,
      editLocation: !props.editDescription,
      location: measurementData.location,
      description: measurementData.description,
      justCreated: true,
      componentStyle: {
        left: eventData.currentPoints.canvas.x + 50,
        top: eventData.currentPoints.canvas.y
      }
    };

    this.mainElement = React.createRef();
  }

  render() {
    let showAddLabel = this.state.justCreated && !this.props.skipButton;
    let showButtons = false;
    let showSelectTree = false;
    let selectTreeTitle = '';
    let treeItems = {};

    if (!showAddLabel) {
      if (this.state.editLocation) {
        treeItems = labelItems;
        selectTreeTitle = `${this.state.location ? 'Edit' : 'Add'} Label`;
        showSelectTree = true;
      } else if (this.state.editDescription) {
        treeItems = descriptionItems;
        selectTreeTitle = `${
          this.state.description ? 'Edit' : 'Add'
        } Description`;
        showSelectTree = true;
      } else {
        showButtons = true;
      }
    }

    return (
      <CSSTransition
        in={this.state.displayComponent}
        appear={true}
        timeout={500}
        classNames="labelling"
        onExited={() => {
          this.props.labellingDoneCallback();
        }}
      >
        <div
          className="labellingComponent"
          style={this.state.componentStyle}
          ref={this.mainElement}
          onMouseLeave={this.fadeOutAndLeave}
          onMouseEnter={this.clearFadeOutTimer}
        >
          {showAddLabel && (
            <button className="addLabelButton" onClick={this.showLabelling}>
              Add Label
            </button>
          )}
          {showSelectTree && (
            <SelectTree
              items={treeItems}
              onSelected={this.selectTreeSelectCalback}
              selectTreeFirstTitle={selectTreeTitle}
              componentMaxHeight={this.state.componentMaxHeight}
            />
          )}
          {showButtons && (
            <>
              <div
                className="checkIconWrapper"
                onClick={this.fadeOutAndLeaveFast}
              >
                <svg className="checkIcon">
                  <use xlinkHref="/icons.svg#check-solid" />
                </svg>
              </div>
              <div className="textArea">
                {this.state.location && this.state.location}
                {this.state.description && ` (${this.state.description})`}
              </div>
              <div className="commonButtons">
                <button
                  className="commonButton"
                  onClick={this.descriptionUpdate}
                >
                  {this.state.description
                    ? 'Edit Description'
                    : 'Add Description'}
                </button>
              </div>
            </>
          )}
        </div>
      </CSSTransition>
    );
  }

  componentDidMount = () => {
    if (this.state.skipButton) {
      this.positioningOverlay();
    }
  };

  componentDidUpdate = () => {
    this.positioningOverlay();
  };

  positioningOverlay = () => {
    const {
      offsetParent,
      offsetTop,
      offsetHeight,
      offsetLeft
    } = this.mainElement.current;
    const componentStyle = cloneDeep(this.state.componentStyle);

    if (offsetHeight + offsetTop > offsetParent.offsetHeight) {
      componentStyle.top =
        offsetTop - (offsetHeight + offsetTop - offsetParent.offsetHeight);
      if (componentStyle.top < 0) {
        componentStyle.top = 0;
      }
    }

    if (offsetLeft + 320 > offsetParent.offsetWidth) {
      componentStyle.left = offsetParent.offsetWidth - 320;
      if (componentStyle.left < 0) {
        componentStyle.left = 0;
      }
    }

    if (
      this.state.componentStyle.top !== componentStyle.top ||
      this.state.componentStyle.left !== componentStyle.left ||
      !this.state.componentMaxHeight
    ) {
      setTimeout(() => {
        const stateToBeChanged = {
          componentStyle
        };
        if (!this.state.componentMaxHeight) {
          stateToBeChanged.componentMaxHeight = offsetParent.offsetHeight;
        }
        this.setState(stateToBeChanged);
      }, 50);
    }
  };

  fadeOutAndLeave = () => {
    // Wait for 1 sec to dismiss the labelling component
    this.fadeOutTimer = setTimeout(() => {
      this.setState({
        displayComponent: false
      });
    }, 1000);
  };

  fadeOutAndLeaveFast = () => {
    this.setState({
      displayComponent: false
    });
  };

  clearFadeOutTimer = () => {
    if (!this.fadeOutTimer) {
      return;
    }

    clearTimeout(this.fadeOutTimer);
  };

  showLabelling = () => {
    this.setState({
      justCreated: false
    });
  };

  descriptionUpdate = () => {
    if (this.setTimeout) {
      clearTimeout(this.setTimeout);
    }
    this.setState({
      editDescription: true
    });
  };

  componentDidMount = () => {
    document.addEventListener('touchstart', this.onTouchStart);
  };

  componentWillUnmount = () => {
    document.removeEventListener('touchstart', this.onTouchStart);
  };

  onTouchStart = () => {
    this.isTouchScreen = true;
  };

  selectTreeSelectCalback = (
    event,
    levelOneItem,
    levelTwoItem,
    stillSelecting
  ) => {
    let { location, description } = cloneDeep(this.state);

    if (this.state.editLocation) {
      location = levelOneItem.label;
    } else {
      description = levelOneItem.label;
    }

    const descriptionText = description ? ` (${description})` : '';
    const textLine = location + descriptionText;

    if (description) {
      this.props.measurementData.description = description;
    }
    this.props.measurementData.location = location;
    this.props.measurementData.additionalData = [textLine];

    this.setState({
      location,
      description,
      editDescription: false,
      editLocation: false
    });

    if (this.isTouchScreen) {
      this.setTimeout = setTimeout(() => {
        this.setState({
          displayComponent: false
        });
      }, 2000);
    }
  };
}

Labelling.propTypes = {
  eventData: PropTypes.object.isRequired,
  measurementData: PropTypes.object.isRequired,
  labellingDoneCallback: PropTypes.func.isRequired
};

export default Labelling;
