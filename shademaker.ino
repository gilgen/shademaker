#include <AccelStepper.h>
#include <OneButton.h>
#include <Fsm.h>
#include <EEPROM.h>

#define DEBUG_MODE true

#define X_STEP_PIN  2
#define Y_STEP_PIN  3
#define Z_STEP_PIN  4
#define DIRECTION   5
#define SOLENOID    6
#define AUTO_MODE   7
#define ENABLE_PIN  8
#define X_STOP_PIN  9
#define Y_STOP_PIN  10
#define Z_STOP_PIN  11
#define A_STEP_PIN  12
#define A_STOP_PIN  13
#define UP_PIN      A0
#define DOWN_PIN    A1
#define TEMPERATURE A2 // Not used yet
#define LIGHT       A3
#define I2C_SCL     A4
#define I2C SDA     A5

#define GEAR_RATIO 5.18181818
#define AUTO_TRANSITION_INTERVAL (unsigned long)21600000 // 6 hours
#define REVOLUTION (long)(800L * GEAR_RATIO)
#define MAX_SPEED REVOLUTION
#define ACCELERATION MAX_SPEED * 1.5
#define SOLENOID_ENABLE_STEPPER_BUMP -100
#define SWITCHES_ACTIVE_LOW true
#define SWITCHES_USE_PULLUP true
#define BOTTOM_POSITION_ADDRESS 0

// FSM events
#define DOWN_LONG_PRESS     1
#define UP_LONG_PRESS       2
#define DOWN_DOUBLE_CLICK   3
#define UP_DOUBLE_CLICK     4
#define AUTO_DOUBLE_CLICK   5
#define DOWN_CLICK          6
#define UP_CLICK            7
#define MOTORS_AT_BOTTOM    8
#define MOTORS_AT_TOP       9
#define UP_PRESSED          10
#define DOWN_PRESSED        11
#define UP_RELEASED         12
#define DOWN_RELEASED       13

unsigned long lastAutoTransitionAt;
long bottomPosition;
boolean inSetupMode = false;

// Stepper instances
AccelStepper xstepper = AccelStepper(AccelStepper::DRIVER, X_STEP_PIN, DIRECTION);
//AccelStepper ystepper = AccelStepper(AccelStepper::DRIVER, Y_STEP_PIN, DIRECTION);
//AccelStepper zstepper = AccelStepper(AccelStepper::DRIVER, Z_STEP_PIN, DIRECTION);
//AccelStepper astepper = AccelStepper(AccelStepper::DRIVER, A_STEP_PIN, DIRECTION);

OneButton upSwitch = OneButton(UP_PIN, SWITCHES_ACTIVE_LOW, SWITCHES_USE_PULLUP);
OneButton downSwitch = OneButton(DOWN_PIN, SWITCHES_ACTIVE_LOW, SWITCHES_USE_PULLUP);
OneButton autoSwitch = OneButton(AUTO_MODE, SWITCHES_ACTIVE_LOW, SWITCHES_USE_PULLUP);

// FSM transition events
void onUpStateEnter() {
  //Serial.println("Entering up state");
}

void onUpStateExit() {
  //Serial.println("Exiting up state");
}

void onDownStateEnter() {
  //Serial.println("Entering down state");
}

void onDownStateExit() {
  //Serial.println("Exiting down state");
}

void onSetupStateEnter() {
  //Serial.println("Entereing setup state");
  inSetupMode = true;
}

void onSetupStateExit() {
  Serial.println("Exiting setup state");
  if(moveBlindsUpButtonActive() && moveBlindsDownButtonActive()) {
    bottomPosition = xstepper.currentPosition();
    Serial.print("Writing new bottom limit to current position of: ");
    Serial.println(bottomPosition);
    EEPROM.put(BOTTOM_POSITION_ADDRESS, bottomPosition);
  }
  inSetupMode = false;
}

void onSetupMoveUpStateEnter() {
  //Serial.println("setup move up enter");
  if (!atTop(&xstepper)) {
    enableSolenoid();
    xstepper.enableOutputs();
    xstepper.moveTo(0);
  }
}

void onSetupMoveUpStateExit() {
  //Serial.println("Moving up exit");
  xstepper.stop();
  xstepper.runToPosition();
  disableSolenoid();
  xstepper.disableOutputs();
}

void onSetupMoveDownStateEnter() {
  //Serial.println("setup down up enter");
  if (!atBottom(&xstepper)) {
    xstepper.enableOutputs();
    enableSolenoid();
    xstepper.runToNewPosition(xstepper.currentPosition() + SOLENOID_ENABLE_STEPPER_BUMP);
    xstepper.moveTo(bottomPosition * 100);
  }
}

void onSetupMoveDownStateExit() {
  //Serial.println("setup dpwn down exit");
  xstepper.stop();
  xstepper.runToPosition();
  disableSolenoid();
  xstepper.disableOutputs();
}

void onMidwayStateEnter() {
  //Serial.println("Entereing midway state");
}

void onMidwayStateExit() {
  //Serial.println("Exiting midway state");
}

void onMovingUpStateEnter() {
  //Serial.println("Moving up enter");
  if (!atTop(&xstepper)) {
    enableSolenoid();
    xstepper.enableOutputs();
    xstepper.moveTo(0);
  }
}

void onMovingUpStateExit() {
  //Serial.println("Moving up exit");
  xstepper.stop();
  xstepper.runToPosition();
  disableSolenoid();
  xstepper.disableOutputs();
}

void onMovingDownStateEnter() {
  //Serial.println("Moving down enter");
  if (!atBottom(&xstepper)) {
    xstepper.enableOutputs();
    enableSolenoid();
    xstepper.runToNewPosition(xstepper.currentPosition() + SOLENOID_ENABLE_STEPPER_BUMP);
    xstepper.moveTo(bottomPosition);
  }
}

void onMovingDownStateExit() {
  //Serial.println("Moving down exit");
  xstepper.stop();
  xstepper.runToPosition();
  disableSolenoid();
  xstepper.disableOutputs();
}

// FSM states
State upState(onUpStateEnter, NULL, &onUpStateExit);
State downState(onDownStateEnter, NULL, &onDownStateExit);
State setupState(onSetupStateEnter, NULL, &onSetupStateExit);
State setupMoveUpState(onSetupMoveUpStateEnter, NULL, &onSetupMoveUpStateExit);
State setupMoveDownState(onSetupMoveDownStateEnter, NULL, &onSetupMoveDownStateExit);
State movingDownState(onMovingDownStateEnter, NULL, &onMovingDownStateExit);
State movingUpState(onMovingUpStateEnter, NULL, &onMovingUpStateExit);
State midwayState(onMidwayStateEnter, NULL, &onMidwayStateExit);

// FSM object
Fsm fsm(&upState);

void setup() {
  Serial.begin(9600);
  Serial.print("Initializing\n");
  initializeAutoTransitionInterval();
  initializeBottomPosition();
  initializePinIO();
  disableSolenoid();
  initializeSteppers();
  homeSteppers();
  initializeSwitchHandlers();
  initializeFSMTransitions();
  Serial.println("Done initialization");
}

void loop() {
  fsm.run_machine();
  upSwitch.tick();
  downSwitch.tick();
  autoSwitch.tick();

  if (xstepper.distanceToGo() == 0) {
    if (atTop(&xstepper)) {
      fsm.trigger(MOTORS_AT_TOP);
    } else if (!inSetupMode && atBottom(&xstepper)) {
      fsm.trigger(MOTORS_AT_BOTTOM);
    }
  }

  if (!inSetupMode) {
     if (autoModeEnabled() && (millis() - lastAutoTransitionAt) > 10000) {
      lastAutoTransitionAt = millis();
      if (isBrightOutside()) {
        if (xstepper.currentPosition() != bottomPosition) {
          Serial.println("It is bright outside. Moving blinds down");
          fsm.trigger(DOWN_CLICK);
        } else {
          Serial.println("It is bright but the blinds are already down. No auto click needed :)");
        }
      } else {
        if (xstepper.currentPosition() != 0) {
          Serial.println("It is dark outside. Moving blinds up");
          fsm.trigger(UP_CLICK);
        } else {
          Serial.println("It is dark but the blinds are already up. No auto click needed :)");
        }
      }
    }
  }

  xstepper.run();
  // ystepper.run();
  // zstepper.run();
  // astepper.run();
}

void initializePinIO() {
  pinMode(DIRECTION, OUTPUT);
  pinMode(X_STEP_PIN, OUTPUT);
  pinMode(Y_STEP_PIN, OUTPUT);
  pinMode(Z_STEP_PIN, OUTPUT);
  pinMode(A_STEP_PIN, OUTPUT);
  pinMode(X_STOP_PIN, INPUT_PULLUP);
  pinMode(Y_STOP_PIN, INPUT_PULLUP);
  pinMode(Z_STOP_PIN, INPUT_PULLUP);
  pinMode(A_STOP_PIN, INPUT_PULLUP);
  pinMode(ENABLE_PIN, OUTPUT);
  pinMode(SOLENOID, OUTPUT);
  pinMode(UP_PIN, INPUT_PULLUP);
  pinMode(DOWN_PIN, INPUT_PULLUP);
  pinMode(LIGHT, INPUT_PULLUP);
  pinMode(AUTO_MODE, INPUT_PULLUP);
}

void homeSteppers() {
  homeStepper(&xstepper, X_STOP_PIN);
  // homeZeroPosition(&ystepper, Y_STOP_PIN);
  // homeZeroPosition(&zstepper, Z_STOP_PIN);
  // homeZeroPosition(&astepper, A_STOP_PIN);
}

void initializeSteppers() {
  initializeStepper(&xstepper);
  // initializeStepper(&ystepper);
  // initializeStepper(&zstepper);
  // initializeStepper(&astepper);
}

void initializeFSMTransitions() {
  // Transitions in and out of setup
  fsm.add_transition(&upState, &setupState, AUTO_DOUBLE_CLICK, NULL);
  fsm.add_transition(&setupState, &downState, AUTO_DOUBLE_CLICK, NULL);

  // Setup up/down control
  fsm.add_transition(&setupState, &setupMoveUpState, UP_CLICK, NULL);
  fsm.add_transition(&setupMoveUpState, &setupState, UP_CLICK, NULL);
  fsm.add_transition(&setupState, &setupMoveDownState, DOWN_CLICK, NULL);
  fsm.add_transition(&setupMoveDownState, &setupState, DOWN_CLICK, NULL);
  fsm.add_transition(&setupMoveUpState, &setupState, MOTORS_AT_TOP, NULL);

  // Up to down
  fsm.add_transition(&upState, &movingDownState, DOWN_CLICK, NULL);
  fsm.add_transition(&movingDownState, &midwayState, DOWN_CLICK, NULL);
  fsm.add_transition(&movingDownState, &midwayState, UP_CLICK, NULL);
  fsm.add_transition(&midwayState, &movingDownState, DOWN_CLICK, NULL);
  fsm.add_transition(&midwayState, &movingUpState, UP_CLICK, NULL);
  fsm.add_transition(&movingDownState, &downState, MOTORS_AT_BOTTOM, NULL);

  // Down to up
  fsm.add_transition(&downState, &movingUpState, UP_CLICK, NULL);
  fsm.add_transition(&movingUpState, &midwayState, UP_CLICK, NULL);
  fsm.add_transition(&midwayState, &movingUpState, UP_CLICK, NULL);
  fsm.add_transition(&movingUpState, &midwayState, DOWN_CLICK, NULL);
  fsm.add_transition(&midwayState, &movingDownState, DOWN_CLICK, NULL);
  fsm.add_transition(&movingUpState, &upState, MOTORS_AT_TOP, NULL);
}

void initializeSwitchHandlers() {
  downSwitch.attachClick([]() {
    //Serial.println("Click on down switch. Triggering DOWN_CLICK");
    fsm.trigger(DOWN_CLICK);
  });

  upSwitch.attachClick([]() {
    //Serial.println("Click on up switch. Triggering UP_CLICK");
    fsm.trigger(UP_CLICK);
  });

  autoSwitch.attachDoubleClick([]() {
    Serial.println("Double click on auto switch.");
    fsm.trigger(AUTO_DOUBLE_CLICK);
  });
}

void initializeStepper(AccelStepper *stepper) {
  stepper->setEnablePin(ENABLE_PIN);
  stepper->setPinsInverted(false, false, true);
  stepper->setMaxSpeed(MAX_SPEED);
  stepper->setAcceleration(ACCELERATION);
  stepper->disableOutputs();
}

void homeStepper(AccelStepper *stepper, int stopPin) {
  Serial.println("Homing...");
  stepper->enableOutputs();
  enableSolenoid();
  stepper->moveTo(-10*REVOLUTION);
  while(digitalRead(stopPin) == HIGH && stepper->distanceToGo() != 0) {
    stepper->run();
  }
  disableSolenoid();
  stepper->disableOutputs();
  stepper->setCurrentPosition(0);
  Serial.println("Home switch activated");
}

void initializeBottomPosition() {
  bottomPosition = EEPROM.get(BOTTOM_POSITION_ADDRESS, bottomPosition);
  if (bottomPosition < 0) {
    Serial.println("Bottom position not configured. Defaulting to one revolution");
    bottomPosition = 1 * REVOLUTION;
  } else {
    Serial.print("Pulled bottom position from EEPROM: ");
    Serial.println(bottomPosition);
  }
}


void initializeAutoTransitionInterval() {
  if (DEBUG_MODE) {
    lastAutoTransitionAt = 10000;
  } else {
    lastAutoTransitionAt = AUTO_TRANSITION_INTERVAL;
  }
}

void disableSolenoid() {
  digitalWrite(SOLENOID, HIGH);
}

void enableSolenoid() {
  digitalWrite(SOLENOID, LOW);
}

boolean atBottom(AccelStepper *stepper) {
  return stepper->currentPosition() == bottomPosition;
}

boolean atTop(AccelStepper *stepper) {
  return stepper->currentPosition() == 0;
}

boolean moveBlindsUpButtonActive() {
  return digitalRead(UP_PIN) == LOW;
}

boolean moveBlindsDownButtonActive() {
  return digitalRead(DOWN_PIN) == LOW;
}

boolean isBrightOutside() {
  return digitalRead(LIGHT) == LOW;
}

boolean autoModeEnabled() {
  return digitalRead(AUTO_MODE) == LOW;
}
