#include <AccelStepper.h>
#include <OneButton.h>
#include <Fsm.h>
#include <EEPROM.h>

#define DEBUG_MODE true

// Pin 0 not used
// Pin 1 not used
#define X_STEP_PIN  2  // step x
#define Y_STEP_PIN  3  // step y
#define Z_STEP_PIN  4  // step z
#define DIRECTION   5  // direction x
#define SOLENOID    6  // direction y  | Both of these have headers pulled out
#define AUTO_MODE   7  // direction z  | of cnc shield and wires soldered onto uno
#define ENABLE_PIN  8  // enable steppers
#define X_STOP_PIN  9  // x stop +
#define Y_STOP_PIN  10 // y stop +
#define Z_STOP_PIN  11 // z stop +
#define A_STEP_PIN  12 // spindle enable
#define A_STOP_PIN  13 // spindle direction
#define UP_PIN      A0 // abort
#define DOWN_PIN    A1 // hold
#define A_STOP_PIN  A2 // resume
#define LIGHT       A3 // coolant enable
// Pin A4 not used
// Pin A5 not used

// Stepper driver modules
#define DRV8825 0
#define TMC2209 1

// Should be one of the above driver modules
#define DRIVER_MODULE TMC2209

#if DRIVER_MODULE == DRV8825
  #define STEPS_PER_SHAFT_REVOLUTION 800L
  #define DIRECTION_PIN_INVERTED false
  #define STEP_PIN_INVERTED false
  #define ENABLE_PIN_INVERTED true
#elif DRIVER_MODULE == TMC2209
  #define STEPS_PER_SHAFT_REVOLUTION 800L
  #define DIRECTION_PIN_INVERTED true
  #define STEP_PIN_INVERTED false
  #define ENABLE_PIN_INVERTED true
#else
  #error You need to select a DRIVER_MODULE
#endif

#define GEAR_RATIO 5.18181818L
#define AUTO_TRANSITION_INTERVAL (unsigned long)21600000 // 6 hours (or use 100000 for testing)
#define REVOLUTION (long)(STEPS_PER_SHAFT_REVOLUTION * GEAR_RATIO)
#define MAX_SPEED REVOLUTION * 0.8 // The UNO can do just over 4000 steps/s :'(
#define ACCELERATION MAX_SPEED * 1.8
#define SOLENOID_ENABLE_STEPPER_BUMP -250
#define SWITCHES_ACTIVE_LOW true
#define SWITCHES_USE_PULLUP true
#define BOTTOM_POSITION_ADDRESS 0
#define SLIP_CORRECTION 2 * REVOLUTION
#define SOLENOID_PWM_LEVEL 110

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

unsigned long lastMoveAt = 0;
long bottomPosition;
boolean inSetupMode = false;
long positions[4];


AccelStepper xstepper = AccelStepper(AccelStepper::DRIVER, X_STEP_PIN, DIRECTION);

OneButton upSwitch = OneButton(UP_PIN, SWITCHES_ACTIVE_LOW, SWITCHES_USE_PULLUP);
OneButton downSwitch = OneButton(DOWN_PIN, SWITCHES_ACTIVE_LOW, SWITCHES_USE_PULLUP);
OneButton autoSwitch = OneButton(AUTO_MODE, SWITCHES_ACTIVE_LOW, SWITCHES_USE_PULLUP);

// FSM transition events
void onUpStateEnter() {
  Serial.println("Entering up state");
}

void onUpStateExit() {
  Serial.println("Exiting up state");
}

void onDownStateEnter() {
  Serial.println("Entering down state");
}

void onDownStateExit() {
  Serial.println("Exiting down state");
}

void onSetupStateEnter() {
  Serial.println("Entereing setup state");
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
  Serial.println("setup move up enter");
  if (!atTop(&xstepper, X_STOP_PIN)) {
    moveBlinds(0);
  }
}

void onSetupMoveUpStateExit() {
  Serial.println("Moving up exit");
  stopBlinds();
}

void onSetupMoveDownStateEnter() {
  Serial.println("setup down up enter");
  if (!atBottom(&xstepper)) {
    Serial.print("Revolution: ");
    Serial.print(REVOLUTION);
    Serial.print(". REVOLUTION * 15: ");
    Serial.print(REVOLUTION * 15);
    moveBlinds(REVOLUTION * (long)30);
  }
}

void onSetupMoveDownStateExit() {
  Serial.println("setup dpwn down exit");
  stopBlinds();
}

void onMidwayStateEnter() {
  Serial.println("Entereing midway state");
}

void onMidwayStateExit() {
  Serial.println("Exiting midway state");
}

void onMovingUpStateEnter() {
  Serial.println("Moving up enter");
  if (!atTop(&xstepper, X_STOP_PIN)) {
    // Serial.print("moving blinds to: ");
    // Serial.println(0 - SLIP_CORRECTION);
    moveBlinds(0 - SLIP_CORRECTION);
  }
}

void onMovingUpStateExit() {
  Serial.println("Moving up exit");
  stopBlinds();
}

void onMovingDownStateEnter() {
  Serial.println("Moving down enter");
  if (!atBottom(&xstepper)) {
    moveBlinds(bottomPosition);
  }
}

void onMovingDownStateExit() {
  Serial.println("Moving down exit");
  stopBlinds();
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
  initializeBottomPosition();
  initializePinIO();
  disableSolenoid();  
  initializeSteppers();
  homeSteppers();
  initializeSwitchHandlers();
  initializeFSMTransitions();
  fsm.run_machine();
  Serial.println("Done initialization");
}

int loopCnt = 0;

void loop() {
  if (xstepper.distanceToGo() == 0 || digitalRead(X_STOP_PIN) == LOW) {
    if (atTop(&xstepper, X_STOP_PIN) && xstepper.currentPosition() >= xstepper.targetPosition()) {
      //Serial.println("Triggering MOTORS_AT_TOP");
      fsm.trigger(MOTORS_AT_TOP);  
    } else if (!inSetupMode && atBottom(&xstepper)) {
      //Serial.println("Triggering MOTORS_AT_BOTTOM");
      fsm.trigger(MOTORS_AT_BOTTOM);
    }
  }

  // Only tick periodically to speed up the run loop. This
  // allows the motors to run a bit smoother
  if (loopCnt % 50 == 0) {
    if (!inSetupMode) {
      runAutoModeRoutines();
    }

    // Tick the switches
    upSwitch.tick();
    downSwitch.tick();
    autoSwitch.tick();
  }


  // Run the steppers
  xstepper.run();
  loopCnt++;
}

void moveBlinds(long newPosition) {
  lastMoveAt = millis();
  xstepper.enableOutputs();
  enableSolenoid();

  // Check if we're moving down. If we are, bump the blind up so that the solenoid can disengage
  if (xstepper.currentPosition() < newPosition) {
    Serial.println("bumping up");
    // TODO: Use MultiStepper for blocking call to make this easier?
    xstepper.runToNewPosition(xstepper.currentPosition() + SOLENOID_ENABLE_STEPPER_BUMP);  
    Serial.println("Done bump");
  }

  Serial.print("Moving blinds to: ");
  Serial.println(newPosition);
  xstepper.moveTo(newPosition);
}

void stopBlinds() {
  xstepper.stop();
  xstepper.runToPosition();
  if (digitalRead(X_STOP_PIN) == LOW || xstepper.currentPosition() < 0) {
    xstepper.setCurrentPosition(0);
  }
  disableSolenoid();
  xstepper.disableOutputs();
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

void runAutoModeRoutines() {
  if (autoModeEnabled() && readyForAutoCmd()) {
    if (isBrightOutside()) {
      if (xstepper.currentPosition() > 0) {
        Serial.println("It is bright outside. Moving blinds down");
        // fsm.trigger(DOWN_CLICK); // For when you want the blinds when it is bright
        fsm.trigger(UP_CLICK); // For when you want the blinds when it is dark
      } else {
        //Serial.println("Checked brightness and it IS bright but the blinds are already down. No auto click needed :)");
      }
    } else {
      if (xstepper.currentPosition() != bottomPosition) {
        // Serial.println("It is dark outside. Moving blinds up");
        // Serial.println(xstepper.currentPosition());
        fsm.trigger(DOWN_CLICK); // For when you want the blinds when it is dark
        // fsm.trigger(UP_CLICK); // For when you want the blinds when it is bright
      } else {
        //Serial.println("Checked brightness and its is dark but the blinds are already up. No auto click needed :)");
      }
    }
  }
}

boolean readyForAutoCmd() {
  //Serial.print("millis - lastMoveAt: ");
  //Serial.println(millis() - lastMoveAt);
  return ((millis() - lastMoveAt) > AUTO_TRANSITION_INTERVAL);
}

void enableAllSteppers() {
  xstepper.enableOutputs();
}

void disableAllSteppers() {
  xstepper.disableOutputs();
}

boolean anySteppersNotAtDestination() {
  return xstepper.distanceToGo() != 0;
}

void homeSteppers() {
  Serial.println("Homing...");  
  homeStepper(&xstepper, X_STOP_PIN);
}

void initializeSteppers() {
  initializeStepper(&xstepper);
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
    Serial.println("Click on down switch. Triggering DOWN_CLICK");
    fsm.trigger(DOWN_CLICK);
  });

  upSwitch.attachClick([]() {
    Serial.println("Click on up switch. Triggering UP_CLICK");
    fsm.trigger(UP_CLICK);
  });

  autoSwitch.attachDoubleClick([]() {
    Serial.println("Double click on auto switch.");
    fsm.trigger(AUTO_DOUBLE_CLICK);
  });

  autoSwitch.attachLongPressStart([]() {
    Serial.println("Auto mode engaged.");
    lastMoveAt = millis() - AUTO_TRANSITION_INTERVAL;
  });

  // xStopSwitch.attachPressStart([]() {
  //  Serial.println("x stop switch engaged");
  // });
}

void initializeStepper(AccelStepper *stepper) {
  stepper->setEnablePin(ENABLE_PIN);
  stepper->setPinsInverted(DIRECTION_PIN_INVERTED, STEP_PIN_INVERTED, ENABLE_PIN_INVERTED);
  stepper->setMaxSpeed(MAX_SPEED);
  stepper->setAcceleration(ACCELERATION);
  stepper->disableOutputs();
}

void homeStepper(AccelStepper *stepper, int stopPin) {
  Serial.println("Homing...");
  stepper->enableOutputs();
  enableSolenoid();
  stepper->moveTo(-20*REVOLUTION);
  while(digitalRead(stopPin) == HIGH && stepper->distanceToGo() != 0) {
    stepper->run();
  }
  stepper->stop();
  xstepper.runToPosition();
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

void disableSolenoid() {
  digitalWrite(SOLENOID, LOW);
}

void enableSolenoid() {
  digitalWrite(SOLENOID, HIGH);
  delay(60);
  analogWrite(SOLENOID, SOLENOID_PWM_LEVEL);
}

boolean atBottom(AccelStepper *stepper) {
  return stepper->currentPosition() == bottomPosition;
}

boolean atTop(AccelStepper *stepper, int stopPin) {
  return stepper->currentPosition() == (0 - SLIP_CORRECTION) || digitalRead(stopPin) == LOW;
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
