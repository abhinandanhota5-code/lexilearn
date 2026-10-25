/**
 * Vocabulary Service
 * Provides child-friendly word meanings with optional LLM integration.
 * Falls back to deterministic dictionary when LLM is unavailable.
 */

import { extractTerms, isTermAllowedAtGrade } from '../ai/grade-vocabulary.js';
import { OllamaLLMProvider, OllamaTimeoutError, OllamaUnavailableError } from '../ai/ollama-provider.js';

// Deterministic fallback dictionary for common words
const FALLBACK_DICTIONARY = Object.freeze({
  'enormous': { meaning: 'Very, very big.', example: 'The elephant is enormous.' },
  'gigantic': { meaning: 'Huge, like a giant.', example: 'The gigantic dinosaur ate leaves from tall trees.' },
  'tiny': { meaning: 'Very, very small.', example: 'The tiny ant carried a crumb.' },
  'happy': { meaning: 'Feeling good and smiling.', example: 'The child was happy to see her friend.' },
  'sad': { meaning: 'Feeling unhappy, like crying.', example: 'He felt sad when his toy broke.' },
  'brave': { meaning: 'Not afraid to do hard things.', example: 'The brave knight fought the dragon.' },
  'scared': { meaning: 'Feeling afraid.', example: 'The loud noise scared the cat.' },
  'fast': { meaning: 'Moving quickly.', example: 'The fast car won the race.' },
  'slow': { meaning: 'Moving at a low speed.', example: 'The slow turtle walked across the road.' },
  'bright': { meaning: 'Full of light or very smart.', example: 'The bright sun warmed the grass.' },
  'dark': { meaning: 'With little or no light.', example: 'It gets dark at night.' },
  'loud': { meaning: 'Making a lot of noise.', example: 'The loud music made us dance.' },
  'quiet': { meaning: 'Making little or no noise.', example: 'The library is a quiet place.' },
  'soft': { meaning: 'Nice to touch, not hard.', example: 'The soft blanket kept her warm.' },
  'hard': { meaning: 'Firm and difficult to break.', example: 'The hard rock hurt his foot.' },
  'beautiful': { meaning: 'Very pretty to look at.', example: 'The beautiful flower smelled sweet.' },
  'ugly': { meaning: 'Not nice to look at.', example: 'The ugly bug had many legs.' },
  'clever': { meaning: 'Smart and good at solving problems.', example: 'The clever fox found the cheese.' },
  'silly': { meaning: 'Funny in a foolish way.', example: 'The silly clown made everyone laugh.' },
  'angry': { meaning: 'Very mad.', example: 'The angry bear growled loudly.' },
  'kind': { meaning: 'Nice and helpful to others.', example: 'The kind teacher helped the student.' },
  'funny': { meaning: 'Making people laugh.', example: 'The funny joke made us giggle.' },
  'serious': { meaning: 'Not joking, very important.', example: 'The doctor had a serious face.' },
  'strong': { meaning: 'Having a lot of power.', example: 'The strong wind blew the leaves.' },
  'weak': { meaning: 'Not strong.', example: 'The weak branch snapped easily.' },
  'heavy': { meaning: 'Hard to lift.', example: 'The heavy box needed two people.' },
  'light': { meaning: 'Not heavy, easy to lift.', example: 'The light feather floated down.' },
  'old': { meaning: 'Has been around a long time.', example: 'The old tree had thick bark.' },
  'new': { meaning: 'Just made or bought.', example: 'She got new shoes for school.' },
  'young': { meaning: 'Not old, early in life.', example: 'The young puppy played with a ball.' },
  'friendly': { meaning: 'Acting like a friend.', example: 'The friendly dog wagged its tail.' },
  'mean': { meaning: 'Not nice to others.', example: 'It is mean to take toys away.' },
  'proud': { meaning: 'Feeling good about what you did.', example: 'She felt proud of her drawing.' },
  'worried': { meaning: 'Thinking something bad might happen.', example: 'He was worried about the test.' },
  'excited': { meaning: 'Very happy and eager.', example: 'The children were excited for the trip.' },
  'bored': { meaning: 'Not interested, nothing to do.', example: 'He felt bored on the long ride.' },
  'surprised': { meaning: 'Not expecting something.', example: 'She was surprised by the gift.' },
  'curious': { meaning: 'Wanting to know more.', example: 'The curious cat looked in the box.' },
  'patient': { meaning: 'Able to wait without getting mad.', example: 'The patient gardener waited for seeds to grow.' },
  'gentle': { meaning: 'Soft and careful.', example: 'Be gentle with the baby bird.' },
  'rough': { meaning: 'Not gentle, harsh.', example: 'The rough sea crashed on the rocks.' },
  'smooth': { meaning: 'Even, no bumps.', example: 'The smooth stone felt nice.' },
  'bumpy': { meaning: 'Full of bumps.', example: 'The bumpy road made the car shake.' },
  'wet': { meaning: 'Covered in water.', example: 'The wet grass soaked his shoes.' },
  'dry': { meaning: 'Not wet.', example: 'The dry towel warmed in the sun.' },
  'clean': { meaning: 'Free from dirt.', example: 'The clean room smelled fresh.' },
  'dirty': { meaning: 'Covered in dirt.', example: 'His dirty hands needed washing.' },
  'full': { meaning: 'Holding as much as possible.', example: 'The full glass spilled over.' },
  'empty': { meaning: 'Holding nothing.', example: 'The empty box was light.' },
  'open': { meaning: 'Not closed.', example: 'The open door let the breeze in.' },
  'closed': { meaning: 'Not open.', example: 'The closed book sat on the shelf.' },
  'near': { meaning: 'Close by.', example: 'The park is near our house.' },
  'far': { meaning: 'A long way away.', example: 'The mountains are far from here.' },
  'high': { meaning: 'Far up.', example: 'The bird flew high in the sky.' },
  'low': { meaning: 'Not high up.', example: 'The low fence was easy to jump.' },
  'long': { meaning: 'Having much length.', example: 'The long rope reached the ground.' },
  'short': { meaning: 'Not long.', example: 'The short pencil needed sharpening.' },
  'wide': { meaning: 'Far from side to side.', example: 'The wide river had a bridge.' },
  'narrow': { meaning: 'Not wide.', example: 'The narrow path went through woods.' },
  'thick': { meaning: 'Wide from one side to the other.', example: 'The thick book had many pages.' },
  'thin': { meaning: 'Not thick.', example: 'The thin ice cracked easily.' },
  'deep': { meaning: 'Going far down.', example: 'The deep well had cold water.' },
  'shallow': { meaning: 'Not deep.', example: 'The shallow pool was safe for kids.' },
  'early': { meaning: 'Before the usual time.', example: 'She woke up early for school.' },
  'late': { meaning: 'After the usual time.', example: 'He was late for the bus.' },
  'before': { meaning: 'Earlier than.', example: 'Wash hands before eating.' },
  'after': { meaning: 'Later than.', example: 'Brush teeth after meals.' },
  'first': { meaning: 'Coming before all others.', example: 'She was first in line.' },
  'last': { meaning: 'Coming after all others.', example: 'He was the last to leave.' },
  'begin': { meaning: 'To start.', example: 'The movie will begin soon.' },
  'end': { meaning: 'To finish.', example: 'The story has a happy end.' },
  'start': { meaning: 'To begin.', example: 'Press start to play the game.' },
  'finish': { meaning: 'To complete.', example: 'Finish your homework first.' },
  'help': { meaning: 'To make easier for someone.', example: 'Can you help me tie my shoe?' },
  'learn': { meaning: 'To gain knowledge.', example: 'We learn new things every day.' },
  'teach': { meaning: 'To show how to do something.', example: 'Dad will teach me to ride a bike.' },
  'read': { meaning: 'To look at and understand words.', example: 'She loves to read books.' },
  'write': { meaning: 'To put words on paper.', example: 'He will write a letter to grandma.' },
  'listen': { meaning: 'To hear with attention.', example: 'Listen to the teacher carefully.' },
  'speak': { meaning: 'To say words aloud.', example: 'Speak clearly so everyone hears.' },
  'walk': { meaning: 'To move on feet.', example: 'They walk to school together.' },
  'run': { meaning: 'To move fast on feet.', example: 'The dog likes to run fast.' },
  'jump': { meaning: 'To push off the ground.', example: 'The frog can jump very high.' },
  'swim': { meaning: 'To move in water.', example: 'Fish swim in the ocean.' },
  'fly': { meaning: 'To move through air.', example: 'Birds fly south for winter.' },
  'climb': { meaning: 'To go up.', example: 'The cat climbed the tall tree.' },
  'fall': { meaning: 'To drop down.', example: 'Leaves fall in autumn.' },
  'push': { meaning: 'To press away.', example: 'Push the door to open it.' },
  'pull': { meaning: 'To drag toward.', example: 'Pull the wagon behind you.' },
  'carry': { meaning: 'To hold and move.', example: 'She will carry the basket.' },
  'hold': { meaning: 'To keep in hands.', example: 'Hold the cup with both hands.' },
  'catch': { meaning: 'To grab something moving.', example: 'Catch the ball with your mitt.' },
  'throw': { meaning: 'To send through air.', example: 'Throw the ball to your friend.' },
  'kick': { meaning: 'To hit with foot.', example: 'He will kick the soccer ball.' },
  'hit': { meaning: 'To strike.', example: 'Hit the nail with the hammer.' },
  'cut': { meaning: 'To divide with a sharp tool.', example: 'Cut the paper with scissors.' },
  'break': { meaning: 'To separate into pieces.', example: 'Be careful not to break the vase.' },
  'fix': { meaning: 'To repair.', example: 'Dad can fix the broken toy.' },
  'build': { meaning: 'To put parts together.', example: 'They build a fort from boxes.' },
  'make': { meaning: 'To create something.', example: 'Let\'s make cookies today.' },
  'draw': { meaning: 'To make a picture.', example: 'She likes to draw animals.' },
  'paint': { meaning: 'To color with paint.', example: 'He will paint the fence white.' },
  'sing': { meaning: 'To make music with voice.', example: 'The birds sing in the morning.' },
  'dance': { meaning: 'To move to music.', example: 'They dance at the party.' },
  'play': { meaning: 'To do something for fun.', example: 'Children play in the park.' },
  'work': { meaning: 'To do a job.', example: 'Mom goes to work each day.' },
  'sleep': { meaning: 'To rest with eyes closed.', example: 'Babies sleep many hours.' },
  'wake': { meaning: 'To stop sleeping.', example: 'Wake up, it is morning!' },
  'eat': { meaning: 'To put food in mouth.', example: 'Eat your vegetables first.' },
  'drink': { meaning: 'To swallow liquid.', example: 'Drink water when thirsty.' },
  'cook': { meaning: 'To prepare food with heat.', example: 'Mom will cook dinner tonight.' },
  'bake': { meaning: 'To cook in an oven.', example: 'We will bake a cake.' },
  'wash': { meaning: 'To clean with water.', example: 'Wash your hands before lunch.' },
  'clean': { meaning: 'To make clean.', example: 'Please clean your room.' },
  'buy': { meaning: 'To get by paying.', example: 'We buy food at the store.' },
  'sell': { meaning: 'To give for money.', example: 'The shop sells fresh bread.' },
  'pay': { meaning: 'To give money for something.', example: 'Pay the cashier five dollars.' },
  'cost': { meaning: 'The price to buy.', example: 'The toy costs ten dollars.' },
  'money': { meaning: 'Coins and bills used to buy.', example: 'She saved her money in a bank.' },
  'store': { meaning: 'A place to buy things.', example: 'The store opens at nine.' },
  'shop': { meaning: 'A small store.', example: 'The flower shop smells nice.' },
  'market': { meaning: 'A place with many sellers.', example: 'Farmers sell at the market.' },
  'school': { meaning: 'A place for learning.', example: 'School starts at eight.' },
  'class': { meaning: 'A group learning together.', example: 'Our class has twenty kids.' },
  'teacher': { meaning: 'A person who teaches.', example: 'The teacher reads a story.' },
  'student': { meaning: 'A person who learns.', example: 'Each student has a desk.' },
  'book': { meaning: 'Pages with words and pictures.', example: 'He reads a book every night.' },
  'pen': { meaning: 'A tool for writing with ink.', example: 'The pen writes in blue.' },
  'pencil': { meaning: 'A tool for writing with graphite.', example: 'Sharpen your pencil.' },
  'paper': { meaning: 'Thin sheets for writing.', example: 'Draw on the white paper.' },
  'desk': { meaning: 'A table for work.', example: 'Sit at your desk please.' },
  'chair': { meaning: 'A seat for one person.', example: 'Push in your chair.' },
  'table': { meaning: 'A flat surface on legs.', example: 'Set the table for dinner.' },
  'door': { meaning: 'An entrance that opens.', example: 'Close the door quietly.' },
  'window': { meaning: 'A glass opening in a wall.', example: 'Look out the window.' },
  'floor': { meaning: 'The bottom of a room.', example: 'The floor needs sweeping.' },
  'wall': { meaning: 'A side of a room.', example: 'Hang the picture on the wall.' },
  'roof': { meaning: 'The top cover of a building.', example: 'Rain hits the roof.' },
  'house': { meaning: 'A building for living in.', example: 'Our house has a red door.' },
  'home': { meaning: 'Where you live.', example: 'Home is where the heart is.' },
  'room': { meaning: 'A space inside a building.', example: 'Her room has blue walls.' },
  'bed': { meaning: 'A place to sleep.', example: 'Make your bed each morning.' },
  'kitchen': { meaning: 'A room for cooking.', example: 'Dinner is in the kitchen.' },
  'bathroom': { meaning: 'A room with a toilet.', example: 'Wash up in the bathroom.' },
  'garden': { meaning: 'A place for growing plants.', example: 'Roses grow in the garden.' },
  'yard': { meaning: 'Grass area near a house.', example: 'The dog plays in the yard.' },
  'street': { meaning: 'A road in a town.', example: 'Cars drive on the street.' },
  'road': { meaning: 'A path for travel.', example: 'The road goes to the city.' },
  'path': { meaning: 'A narrow way for walking.', example: 'Follow the path in the woods.' },
  'bridge': { meaning: 'A way over water or a gap.', example: 'The bridge crosses the river.' },
  'river': { meaning: 'A large flowing water.', example: 'Fish swim in the river.' },
  'lake': { meaning: 'Water surrounded by land.', example: 'We swim in the lake.' },
  'ocean': { meaning: 'A huge body of salt water.', example: 'The ocean has big waves.' },
  'sea': { meaning: 'A large salt water.', example: 'The sea is blue and deep.' },
  'beach': { meaning: 'Sand by the water.', example: 'Build a castle on the beach.' },
  'sand': { meaning: 'Tiny grains of rock.', example: 'Sand gets in your shoes.' },
  'water': { meaning: 'Clear liquid for drinking.', example: 'Drink water every day.' },
  'rain': { meaning: 'Water falling from clouds.', example: 'Rain makes the grass green.' },
  'snow': { meaning: 'Frozen water falling.', example: 'Snow covers the ground white.' },
  'ice': { meaning: 'Frozen water.', example: 'Ice is cold and slippery.' },
  'cloud': { meaning: 'White puffs in the sky.', example: 'Clouds bring rain sometimes.' },
  'sky': { meaning: 'The space above the earth.', example: 'The sky is blue today.' },
  'sun': { meaning: 'The star that gives light.', example: 'The sun warms the earth.' },
  'moon': { meaning: 'The light in the night sky.', example: 'The moon shines at night.' },
  'star': { meaning: 'A tiny light in the night sky.', example: 'Stars twinkle above us.' },
  'wind': { meaning: 'Moving air.', example: 'The wind blows the leaves.' },
  'storm': { meaning: 'Bad weather with wind and rain.', example: 'The storm knocked down a tree.' },
  'fire': { meaning: 'Hot burning flames.', example: 'Fire keeps us warm.' },
  'heat': { meaning: 'Warmth.', example: 'The heat from the sun feels good.' },
  'cold': { meaning: 'Low temperature.', example: 'Ice cream is cold.' },
  'warm': { meaning: 'A little hot.', example: 'Wear a warm coat outside.' },
  'cool': { meaning: 'A little cold.', example: 'A cool breeze feels nice.' },
  'hot': { meaning: 'Very warm.', example: 'The soup is too hot.' },
  'freeze': { meaning: 'To turn to ice.', example: 'Water will freeze at night.' },
  'melt': { meaning: 'To turn from solid to liquid.', example: 'The sun makes ice melt.' },
  'boil': { meaning: 'To get very hot with bubbles.', example: 'Water boils at 100 degrees.' },
  'steam': { meaning: 'Hot water vapor.', example: 'Steam rises from hot tea.' },
  'gas': { meaning: 'Air-like substance.', example: 'The car runs on gas.' },
  'liquid': { meaning: 'Flows like water.', example: 'Milk is a liquid.' },
  'solid': { meaning: 'Hard, keeps its shape.', example: 'A rock is a solid.' },
  'matter': { meaning: 'Everything made of atoms.', example: 'All things are made of matter.' },
  'energy': { meaning: 'Power to do work.', example: 'Food gives us energy.' },
  'force': { meaning: 'A push or pull.', example: 'Gravity is a force.' },
  'gravity': { meaning: 'Force that pulls down.', example: 'Gravity keeps us on the ground.' },
  'magnet': { meaning: 'Pulls metal things.', example: 'The magnet picks up nails.' },
  'electric': { meaning: 'Powered by electricity.', example: 'The lamp needs electric power.' },
  'battery': { meaning: 'Stores electric power.', example: 'The toy needs a battery.' },
  'wire': { meaning: 'Metal thread for electricity.', example: 'Wires carry power to lights.' },
  'light': { meaning: 'Brightness to see by.', example: 'Turn on the light please.' },
  'shadow': { meaning: 'Dark shape from blocked light.', example: 'Your shadow follows you.' },
  'mirror': { meaning: 'Glass that shows reflection.', example: 'Look in the mirror.' },
  'lens': { meaning: 'Curved glass for seeing.', example: 'Glasses have lenses.' },
  'sound': { meaning: 'What you hear.', example: 'The sound of rain is soft.' },
  'noise': { meaning: 'Loud or unpleasant sound.', example: 'The noise hurt my ears.' },
  'music': { meaning: 'Pleasant organized sound.', example: 'She plays beautiful music.' },
  'song': { meaning: 'Music with words.', example: 'Sing a happy song.' },
  'instrument': { meaning: 'Tool for making music.', example: 'The piano is an instrument.' },
  'drum': { meaning: 'Instrument hit with sticks.', example: 'He plays the drum loud.' },
  'guitar': { meaning: 'String instrument played with fingers.', example: 'She strums the guitar.' },
  'piano': { meaning: 'Large instrument with keys.', example: 'He takes piano lessons.' },
  'violin': { meaning: 'String instrument with a bow.', example: 'The violin sounds sweet.' },
  'trumpet': { meaning: 'Brass instrument blown into.', example: 'The trumpet plays high notes.' },
  'flute': { meaning: 'Woodwind blown across.', example: 'She plays the flute well.' },
  'bell': { meaning: 'Metal cup that rings.', example: 'The school bell rings at three.' },
  'whistle': { meaning: 'High sound from blowing.', example: 'The referee blows the whistle.' },
  'clap': { meaning: 'Hit palms together.', example: 'Clap your hands for the show.' },
  'stomp': { meaning: 'Step heavily.', example: 'Stomp your feet to the beat.' },
  'snap': { meaning: 'Click fingers sharply.', example: 'Snap your fingers to the rhythm.' },
  'hum': { meaning: 'Sing with closed mouth.', example: 'He hums while he works.' },
  'whisper': { meaning: 'Speak very quietly.', example: 'Whisper in the library.' },
  'shout': { meaning: 'Speak very loudly.', example: 'Don\'t shout in the house.' },
  'scream': { meaning: 'Loud high cry.', example: 'The roller coaster made her scream.' },
  'laugh': { meaning: 'Sound of being happy.', example: 'The joke made everyone laugh.' },
  'cry': { meaning: 'Shed tears.', example: 'The baby cries when hungry.' },
  'smile': { meaning: 'Turn mouth up at corners.', example: 'Her smile lights up the room.' },
  'frown': { meaning: 'Turn mouth down at corners.', example: 'He frowns when confused.' },
  'wave': { meaning: 'Move hand to greet.', example: 'Wave goodbye to your friend.' },
  'nod': { meaning: 'Move head up and down for yes.', example: 'Nod if you understand.' },
  'shake': { meaning: 'Move head side to side for no.', example: 'Shake your head no.' },
  'hug': { meaning: 'Hold close with arms.', example: 'Give your mom a hug.' },
  'kiss': { meaning: 'Touch with lips to show love.', example: 'Kiss the baby on the cheek.' },
  'love': { meaning: 'Deep caring feeling.', example: 'I love my family very much.' },
  'like': { meaning: 'Enjoy something.', example: 'I like ice cream.' },
  'dislike': { meaning: 'Not like.', example: 'He dislikes spicy food.' },
  'hate': { meaning: 'Strong dislike.', example: 'She hates waking up early.' },
  'want': { meaning: 'Wish to have.', example: 'I want a new bike.' },
  'need': { meaning: 'Must have.', example: 'Plants need water to grow.' },
  'hope': { meaning: 'Wish for something good.', example: 'I hope it snows tomorrow.' },
  'wish': { meaning: 'Want something to happen.', example: 'Make a wish on a star.' },
  'dream': { meaning: 'Story in sleep, or a hope.', example: 'She dreams of being a pilot.' },
  'think': { meaning: 'Use your mind.', example: 'Think before you answer.' },
  'know': { meaning: 'Have knowledge.', example: 'I know the answer.' },
  'understand': { meaning: 'Get the meaning.', example: 'Do you understand the question?' },
  'remember': { meaning: 'Keep in memory.', example: 'Remember to bring your book.' },
  'forget': { meaning: 'Not remember.', example: 'Don\'t forget your homework.' },
  'imagine': { meaning: 'Picture in your mind.', example: 'Imagine a world of candy.' },
  'guess': { meaning: 'Try to answer without knowing.', example: 'Guess how many jelly beans.' },
  'choose': { meaning: 'Pick one.', example: 'Choose your favorite color.' },
  'decide': { meaning: 'Make up your mind.', example: 'Decide what game to play.' },
  'plan': { meaning: 'Think about future steps.', example: 'Plan your weekend trip.' },
  'try': { meaning: 'Make an effort.', example: 'Try your best on the test.' },
  'succeed': { meaning: 'Do well, reach a goal.', example: 'You will succeed if you practice.' },
  'fail': { meaning: 'Not succeed.', example: 'It is okay to fail and try again.' },
  'win': { meaning: 'Be the best in a contest.', example: 'Our team won the game.' },
  'lose': { meaning: 'Not win.', example: 'It is okay to lose sometimes.' },
  'race': { meaning: 'A speed contest.', example: 'The turtle and hare had a race.' },
  'game': { meaning: 'Play with rules.', example: 'Let\'s play a board game.' },
  'team': { meaning: 'Group working together.', example: 'Our soccer team practices daily.' },
  'player': { meaning: 'Person in a game.', example: 'Each player has a position.' },
  'score': { meaning: 'Points in a game.', example: 'The score is tied now.' },
  'goal': { meaning: 'What you aim for.', example: 'Her goal is to read ten books.' },
  'prize': { meaning: 'Reward for winning.', example: 'The winner gets a prize.' },
  'trophy': { meaning: 'Cup for a big win.', example: 'The team lifted the trophy.' },
  'medal': { meaning: 'Metal disc for a win.', example: 'She wore her gold medal.' },
  'ribbon': { meaning: 'Cloth strip for a prize.', example: 'The blue ribbon is for first place.' },
  'crown': { meaning: 'Headpiece for a king/queen.', example: 'The princess wore a crown.' },
  'king': { meaning: 'Male ruler.', example: 'The king sits on a throne.' },
  'queen': { meaning: 'Female ruler.', example: 'The queen wears a crown.' },
  'prince': { meaning: 'King\'s son.', example: 'The prince rides a white horse.' },
  'princess': { meaning: 'Queen\'s daughter.', example: 'The princess lives in a castle.' },
  'castle': { meaning: 'Big strong building for royalty.', example: 'The castle has high towers.' },
  'knight': { meaning: 'Soldier on a horse.', example: 'The knight has shiny armor.' },
  'dragon': { meaning: 'Big fire-breathing creature.', example: 'The dragon guards the gold.' },
  'magic': { meaning: 'Special power to do impossible things.', example: 'The wizard uses magic.' },
  'wizard': { meaning: 'Man who does magic.', example: 'The wizard waved his wand.' },
  'witch': { meaning: 'Woman who does magic.', example: 'The witch flew on a broom.' },
  'fairy': { meaning: 'Small magic creature with wings.', example: 'The fairy granted a wish.' },
  'elf': { meaning: 'Small magic helper.', example: 'The elf makes toys for Santa.' },
  'giant': { meaning: 'Huge human-like creature.', example: 'The giant climbed the beanstalk.' },
  'monster': { meaning: 'Scary imaginary creature.', example: 'The monster lives under the bed.' },
  'ghost': { meaning: 'Spirit of a dead person.', example: 'The ghost says boo!' },
  'pirate': { meaning: 'Robber on a ship.', example: 'The pirate has a treasure map.' },
  'treasure': { meaning: 'Valuable hidden things.', example: 'X marks the treasure spot.' },
  'map': { meaning: 'Drawing of a place.', example: 'Follow the map to the park.' },
  'compass': { meaning: 'Tool that points north.', example: 'A compass helps you find the way.' },
  'north': { meaning: 'Direction to the top of a map.', example: 'Birds fly north in spring.' },
  'south': { meaning: 'Direction to the bottom of a map.', example: 'It is warm in the south.' },
  'east': { meaning: 'Direction where sun rises.', example: 'The sun comes up in the east.' },
  'west': { meaning: 'Direction where sun sets.', example: 'The sun goes down in the west.' },
  'left': { meaning: 'Side where thumb is on left hand.', example: 'Turn left at the corner.' },
  'right': { meaning: 'Side where thumb is on right hand.', example: 'Turn right at the light.' },
  'up': { meaning: 'Toward the sky.', example: 'Look up at the clouds.' },
  'down': { meaning: 'Toward the ground.', example: 'Sit down on the chair.' },
  'in': { meaning: 'Inside.', example: 'The toy is in the box.' },
  'out': { meaning: 'Outside.', example: 'Go out to play.' },
  'on': { meaning: 'Resting on top.', example: 'The book is on the table.' },
  'off': { meaning: 'Not on.', example: 'Take your shoes off.' },
  'over': { meaning: 'Above, across.', example: 'Jump over the puddle.' },
  'under': { meaning: 'Below.', example: 'The cat hides under the bed.' },
  'above': { meaning: 'Higher than.', example: 'The plane flies above the clouds.' },
  'below': { meaning: 'Lower than.', example: 'The basement is below the house.' },
  'between': { meaning: 'In the middle of two.', example: 'Stand between your friends.' },
  'beside': { meaning: 'Next to.', example: 'Sit beside me.' },
  'behind': { meaning: 'At the back of.', example: 'The dog is behind the tree.' },
  'front': { meaning: 'The forward part.', example: 'Stand in the front of the line.' },
  'back': { meaning: 'The rear part.', example: 'Sit in the back seat.' },
  'top': { meaning: 'Highest part.', example: 'The cherry is on top.' },
  'bottom': { meaning: 'Lowest part.', example: 'Sign at the bottom of the page.' },
  'middle': { meaning: 'Center part.', example: 'The middle child is eight.' },
  'center': { meaning: 'Exact middle.', example: 'The target center is red.' },
  'edge': { meaning: 'Outside border.', example: 'Don\'t fall off the edge.' },
  'corner': { meaning: 'Where two edges meet.', example: 'Put the stamp in the corner.' },
  'side': { meaning: 'One surface of an object.', example: 'Write on one side only.' },
  'front': { meaning: 'The forward side.', example: 'The front of the shirt is blue.' },
  'back': { meaning: 'The rear side.', example: 'The back has a picture.' },
  'inside': { meaning: 'Inner part.', example: 'The inside of the apple is white.' },
  'outside': { meaning: 'Outer part.', example: 'The outside of the apple is red.' },
  'front': { meaning: 'Forward side.', example: 'Front door opens outward.' },
  'rear': { meaning: 'Back side.', example: 'Rear window is dirty.' },
  'top': { meaning: 'Upper surface.', example: 'Top of the mountain is snow.' },
  'base': { meaning: 'Bottom support.', example: 'The lamp has a wide base.' },
  'tip': { meaning: 'Pointed end.', example: 'The tip of the pencil is sharp.' },
  'end': { meaning: 'Final part.', example: 'The end of the rope is frayed.' },
  'beginning': { meaning: 'Starting part.', example: 'The beginning of the story is slow.' },
  'middle': { meaning: 'Center part.', example: 'The middle of the book is exciting.' },
  'finish': { meaning: 'The end.', example: 'Cross the finish line first.' },
  'start': { meaning: 'Beginning.', example: 'Ready, set, start!' },
  'first': { meaning: 'Number one.', example: 'She got first place.' },
  'second': { meaning: 'Number two.', example: 'He came in second.' },
  'third': { meaning: 'Number three.', example: 'Third time is the charm.' },
  'last': { meaning: 'Final one.', example: 'The last cookie is yours.' },
  'next': { meaning: 'Coming after this one.', example: 'Who is next in line?' },
  'previous': { meaning: 'Coming before this one.', example: 'The previous page was blank.' },
  'now': { meaning: 'At this time.', example: 'Do it now, not later.' },
  'then': { meaning: 'At that time.', example: 'First wash, then eat.' },
  'today': { meaning: 'This day.', example: 'Today is Monday.' },
  'tomorrow': { meaning: 'The day after today.', example: 'Tomorrow is Tuesday.' },
  'yesterday': { meaning: 'The day before today.', example: 'Yesterday was Sunday.' },
  'week': { meaning: 'Seven days.', example: 'A week has seven days.' },
  'month': { meaning: 'About four weeks.', example: 'December is a month.' },
  'year': { meaning: 'Twelve months.', example: 'A year has 365 days.' },
  'morning': { meaning: 'Early part of day.', example: 'Good morning, sunshine!' },
  'afternoon': { meaning: 'Middle part of day.', example: 'See you this afternoon.' },
  'evening': { meaning: 'Late part of day.', example: 'Dinner is in the evening.' },
  'night': { meaning: 'Dark time for sleeping.', example: 'Good night, sleep tight.' },
  'noon': { meaning: 'Twelve o\'clock midday.', example: 'Lunch is at noon.' },
  'midnight': { meaning: 'Twelve o\'clock at night.', example: 'Cinderella left at midnight.' },
  'hour': { meaning: 'Sixty minutes.', example: 'Wait one hour.' },
  'minute': { meaning: 'Sixty seconds.', example: 'Just a minute please.' },
  'second': { meaning: 'Very short time.', example: 'Wait a second.' },
  'clock': { meaning: 'Tells the time.', example: 'The clock says three.' },
  'watch': { meaning: 'Small clock on wrist.', example: 'He checks his watch.' },
  'calendar': { meaning: 'Shows days and months.', example: 'Mark the date on the calendar.' },
  'date': { meaning: 'Day of the month.', example: 'Today\'s date is the fifth.' },
  'day': { meaning: 'Twenty-four hours.', example: 'Have a nice day.' },
  'weekend': { meaning: 'Saturday and Sunday.', example: 'We rest on the weekend.' },
  'weekday': { meaning: 'Monday through Friday.', example: 'School is on weekdays.' },
  'holiday': { meaning: 'Special day off.', example: 'Christmas is a holiday.' },
  'birthday': { meaning: 'Day you were born.', example: 'My birthday is in June.' },
  'party': { meaning: 'Fun gathering.', example: 'We had a birthday party.' },
  'gift': { meaning: 'Something given freely.', example: 'She opened her gift.' },
  'present': { meaning: 'A gift.', example: 'He wrapped the present.' },
  'card': { meaning: 'Paper greeting.', example: 'Sign the birthday card.' },
  'cake': { meaning: 'Sweet baked dessert.', example: 'Blow out the candles on the cake.' },
  'candle': { meaning: 'Wax stick with a wick.', example: 'The candle flickers.' },
  'balloon': { meaning: 'Rubber bag filled with air.', example: 'The red balloon floats up.' },
  'party': { meaning: 'Celebration.', example: 'The party starts at two.' },
  'friend': { meaning: 'Person you like.', example: 'She is my best friend.' },
  'family': { meaning: 'People related to you.', example: 'Family eats dinner together.' },
  'mother': { meaning: 'Female parent.', example: 'Mother cooks good food.' },
  'father': { meaning: 'Male parent.', example: 'Father reads bedtime stories.' },
  'sister': { meaning: 'Female sibling.', example: 'My sister is older than me.' },
  'brother': { meaning: 'Male sibling.', example: 'My brother plays soccer.' },
  'baby': { meaning: 'Very young child.', example: 'The baby sleeps a lot.' },
  'child': { meaning: 'Young person.', example: 'Every child needs love.' },
  'adult': { meaning: 'Grown-up person.', example: 'Adults go to work.' },
  'grandmother': { meaning: 'Mother\'s mother.', example: 'Grandmother bakes cookies.' },
  'grandfather': { meaning: 'Father\'s father.', example: 'Grandfather tells good stories.' },
  'aunt': { meaning: 'Parent\'s sister.', example: 'Aunt Mary visits on Sundays.' },
  'uncle': { meaning: 'Parent\'s brother.', example: 'Uncle Joe teaches me chess.' },
  'cousin': { meaning: 'Aunt/uncle\'s child.', example: 'My cousin is my age.' },
  'neighbor': { meaning: 'Person living nearby.', example: 'Our neighbor has a cat.' },
  'doctor': { meaning: 'Person who treats sick people.', example: 'The doctor checks your heart.' },
  'nurse': { meaning: 'Helper to the doctor.', example: 'The nurse gave a bandage.' },
  'dentist': { meaning: 'Tooth doctor.', example: 'The dentist cleans teeth.' },
  'vet': { meaning: 'Animal doctor.', example: 'Take the dog to the vet.' },
  'teacher': { meaning: 'Person who teaches.', example: 'The teacher is kind.' },
  'librarian': { meaning: 'Person who runs the library.', example: 'The librarian recommends books.' },
  'police': { meaning: 'Keeps people safe.', example: 'The police officer directs traffic.' },
  'firefighter': { meaning: 'Puts out fires.', example: 'The firefighter saves people.' },
  'mailman': { meaning: 'Delivers letters.', example: 'The mailman brings the mail.' },
  'farmer': { meaning: 'Grows food.', example: 'The farmer milks the cows.' },
  'baker': { meaning: 'Makes bread.', example: 'The baker wakes up early.' },
  'cook': { meaning: 'Prepares food.', example: 'The cook makes yummy soup.' },
  'driver': { meaning: 'Drives a vehicle.', example: 'The bus driver is friendly.' },
  'pilot': { meaning: 'Flies a plane.', example: 'The pilot lands the plane.' },
  'sailor': { meaning: 'Works on a ship.', example: 'The sailor sees the world.' },
  'soldier': { meaning: 'Protects the country.', example: 'The soldier wears a uniform.' },
  'artist': { meaning: 'Makes art.', example: 'The artist paints pictures.' },
  'musician': { meaning: 'Plays music.', example: 'The musician plays violin.' },
  'dancer': { meaning: 'Dances for art.', example: 'The dancer spins on stage.' },
  'writer': { meaning: 'Writes books.', example: 'The writer has many ideas.' },
  'actor': { meaning: 'Pretends in plays.', example: 'The actor wears a costume.' },
  'singer': { meaning: 'Sings songs.', example: 'The singer has a great voice.' },
  'scientist': { meaning: 'Studies how things work.', example: 'The scientist looks at stars.' },
  'inventor': { meaning: 'Makes new things.', example: 'The inventor made a flying car.' },
  'explorer': { meaning: 'Travels to new places.', example: 'The explorer found a new land.' },
  'astronaut': { meaning: 'Travels in space.', example: 'The astronaut floats in space.' },
  'robot': { meaning: 'Machine that can do tasks.', example: 'The robot cleans the floor.' },
  'computer': { meaning: 'Machine for thinking.', example: 'I do homework on the computer.' },
  'phone': { meaning: 'Call and message device.', example: 'Call mom on the phone.' },
  'tablet': { meaning: 'Flat touch computer.', example: 'Read books on the tablet.' },
  'screen': { meaning: 'Flat display.', example: 'The screen shows the movie.' },
  'keyboard': { meaning: 'Keys for typing.', example: 'Type on the keyboard.' },
  'mouse': { meaning: 'Pointing device.', example: 'Click the mouse button.' },
  'printer': { meaning: 'Makes paper copies.', example: 'The printer is out of ink.' },
  'camera': { meaning: 'Takes pictures.', example: 'Smile for the camera.' },
  'video': { meaning: 'Moving pictures.', example: 'Watch a video online.' },
  'photo': { meaning: 'Still picture.', example: 'That is a nice photo.' },
  'picture': { meaning: 'An image.', example: 'Draw a picture of a house.' },
  'movie': { meaning: 'Long video story.', example: 'We watched a funny movie.' },
  'show': { meaning: 'TV program.', example: 'My show starts at seven.' },
  'channel': { meaning: 'TV station.', example: 'Change the channel please.' },
  'remote': { meaning: 'Control for TV.', example: 'Where is the remote?' },
  'battery': { meaning: 'Power cell.', example: 'The remote needs a battery.' },
  'plug': { meaning: 'Connect to power.', example: 'Plug in the lamp.' },
  'outlet': { meaning: 'Wall hole for power.', example: 'The outlet has two holes.' },
  'switch': { meaning: 'Turns on/off.', example: 'Flip the switch up.' },
  'bulb': { meaning: 'Glass light maker.', example: 'Change the light bulb.' },
  'lamp': { meaning: 'Light on a stand.', example: 'Read by the lamp.' },
  'fan': { meaning: 'Blows air.', example: 'The fan cools the room.' },
  'heater': { meaning: 'Makes heat.', example: 'The heater warms the house.' },
  'air': { meaning: 'Invisible gas we breathe.', example: 'Fresh air feels good.' },
  'oxygen': { meaning: 'Gas we need to live.', example: 'We breathe oxygen.' },
  'breath': { meaning: 'Air in and out.', example: 'Take a deep breath.' },
  'breathe': { meaning: 'Move air in and out.', example: 'Breathe slowly to relax.' },
  'heart': { meaning: 'Pumps blood.', example: 'Your heart beats fast when running.' },
  'blood': { meaning: 'Red liquid in body.', example: 'Blood carries oxygen.' },
  'bone': { meaning: 'Hard part inside body.', example: 'Calcium makes bones strong.' },
  'muscle': { meaning: 'Moves the body.', example: 'Exercise makes muscles big.' },
  'brain': { meaning: 'Thinking organ.', example: 'The brain controls the body.' },
  'skin': { meaning: 'Outer body covering.', example: 'Skin protects you.' },
  'hair': { meaning: 'Strands on head.', example: 'Brush your hair.' },
  'eye': { meaning: 'Sees things.', example: 'Close your eyes to sleep.' },
  'ear': { meaning: 'Hears things.', example: 'Listen with your ears.' },
  'nose': { meaning: 'Smells things.', example: 'The nose knows the smell.' },
  'mouth': { meaning: 'Eats and speaks.', example: 'Open your mouth wide.' },
  'tooth': { meaning: 'Hard white in mouth.', example: 'Brush each tooth.' },
  'tongue': { meaning: 'Soft part in mouth.', example: 'The tongue tastes food.' },
  'hand': { meaning: 'End of arm.', example: 'Wash your hands.' },
  'foot': { meaning: 'End of leg.', example: 'Wiggle your toes.' },
  'finger': { meaning: 'Small parts on hand.', example: 'Ten fingers, ten toes.' },
  'toe': { meaning: 'Small parts on foot.', example: 'Count your toes.' },
  'arm': { meaning: 'Upper limb.', example: 'Raise your arm high.' },
  'leg': { meaning: 'Lower limb.', example: 'Stand on one leg.' },
  'head': { meaning: 'Top of body.', example: 'Wear a hat on your head.' },
  'face': { meaning: 'Front of head.', example: 'Wash your face.' },
  'neck': { meaning: 'Connects head to body.', example: 'Turn your neck slowly.' },
  'shoulder': { meaning: 'Where arm meets body.', example: 'Carry the bag on your shoulder.' },
  'elbow': { meaning: 'Bend in arm.', example: 'Rest your elbow on the table.' },
  'wrist': { meaning: 'Where hand meets arm.', example: 'Wear a watch on your wrist.' },
  'knee': { meaning: 'Bend in leg.', example: 'Scrape your knee playing.' },
  'ankle': { meaning: 'Where foot meets leg.', example: 'Twist your ankle running.' },
  'hip': { meaning: 'Where leg meets body.', example: 'Put your hands on your hips.' },
  'stomach': { meaning: 'Holds food.', example: 'My stomach is hungry.' },
  'back': { meaning: 'Rear of body.', example: 'Lie on your back.' },
  'chest': { meaning: 'Front upper body.', example: 'Put your hand on your chest.' },
  'thumb': { meaning: 'Short thick finger.', example: 'Thumbs up for good job!' },
  'nail': { meaning: 'Hard cover on finger tip.', example: 'Trim your nails.' },
  'kiss': { meaning: 'Touch lips to show love.', example: 'Kiss your mom goodbye.' },
  'hug': { meaning: 'Hold tight with arms.', example: 'Give a big hug.' }
});

/**
 * Vocabulary Service class
 */
export class VocabularyService {
  constructor(options = {}) {
    this.llmProvider = options.llmProvider || null;
    this.enabled = options.enabled !== false;
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  /**
   * Get word meaning - checks cache, then LLM, then fallback
   * @param {string} word
   * @param {string} grade
   * @returns {Promise<{meaning: string, example: string, source: string}>}
   */
  async getWordMeaning(word, grade = '3rd Grade') {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleanWord) {
      return this.createErrorResponse(word);
    }

    // Check cache first
    const cacheKey = `${cleanWord}:${grade}`;
    if (this.cache.has(cacheKey)) {
      return { ...this.cache.get(cacheKey), source: 'cache' };
    }

    // Check for pending request (avoid duplicate calls)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create promise for this request
    const promise = this.fetchMeaning(cleanWord, grade);
    this.pendingRequests.set(cacheKey, promise);

    try {
      const result = await promise;
      // Cache successful results
      if (result.source !== 'error') {
        this.cache.set(cacheKey, result);
      }
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Fetch meaning from LLM or fallback
   */
  async fetchMeaning(word, grade) {
    // Try LLM first if available
    if (this.llmProvider && this.enabled) {
      try {
        const llmResult = await this.queryLLM(word, grade);
        if (llmResult) {
          return { ...llmResult, source: 'llm' };
        }
      } catch (err) {
        console.warn('LLM vocabulary query failed, using fallback:', err.message);
      }
    }

    // Fallback to deterministic dictionary
    const fallback = FALLBACK_DICTIONARY[word];
    if (fallback) {
      return { ...fallback, source: 'fallback' };
    }

    // Generate a basic response for unknown words
    return this.createBasicResponse(word);
  }

  /**
   * Query LLM for word meaning
   */
  async queryLLM(word, grade) {
    const prompt = `You are a children's dictionary for ${grade}. Define the word "${word}" in simple language a child would understand.

Return ONLY valid JSON in this exact format:
{
  "meaning": "Simple, child-friendly definition (max 15 words)",
  "example": "Short, simple sentence using the word (max 20 words)"
}

Rules:
- Use only simple words a ${grade} student knows
- Do NOT use the word itself in the definition
- Keep definitions under 15 words
- Keep examples under 20 words
- Be encouraging and clear`;

    try {
      const result = await this.llmProvider.generateStructured(prompt, null, {
        temperature: 0.3,
        maxTokens: 200,
        timeoutMs: 8000 // Short timeout for vocabulary
      });

      if (result && result.meaning && result.example) {
        return {
          meaning: result.meaning.trim(),
          example: result.example.trim()
        };
      }
    } catch (err) {
      if (err instanceof OllamaTimeoutError || err instanceof OllamaUnavailableError) {
        throw err;
      }
      console.warn('LLM vocabulary error:', err.message);
    }
    return null;
  }

  /**
   * Create basic response for unknown words
   */
  createBasicResponse(word) {
    return {
      word: word,
      meaning: `A word you can learn: "${word}".`,
      example: `Can you use "${word}" in a sentence?`,
      source: 'generated-basic'
    };
  }

  /**
   * Create error response
   */
  createErrorResponse(word) {
    return {
      word: word,
      meaning: 'Unable to look up this word right now.',
      example: 'Try again later or ask a grown-up.',
      source: 'error'
    };
  }

  /**
   * Check if a word should be clickable (not a stopword, reasonable length)
   */
  static isClickableWord(word) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean || clean.length < 3) return false;
    if (clean.length > 20) return false;
    // Skip very common words that don't need definitions
    const skipWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy',
      'did', 'she', 'use', 'way', 'been', 'call', 'come', 'could', 'down',
      'each', 'find', 'first', 'from', 'good', 'great', 'have', 'know', 'last',
      'like', 'little', 'long', 'made', 'make', 'many', 'most', 'much', 'must',
      'never', 'other', 'over', 'part', 'place', 'put', 'right', 'said', 'same',
      'should', 'some', 'take', 'tell', 'than', 'their', 'them', 'then', 'there',
      'these', 'they', 'think', 'this', 'those', 'time', 'very', 'well', 'went',
      'were', 'what', 'when', 'which', 'will', 'with', 'would', 'your'
    ]);
    return !skipWords.has(clean);
  }

  /**
   * Process text to make words clickable
   * @param {string} text
   * @returns {string} HTML with clickable words wrapped in spans
   */
  static makeWordsClickable(text) {
    if (!text) return '';

    // Split by word boundaries, preserving punctuation and whitespace
    const tokens = text.split(/(\s+|[.,;:!?()"']+)/);

    return tokens.map(token => {
      // Don't wrap whitespace or pure punctuation
      if (!token.trim() || /^[\s.,;:!?()"']+$/.test(token)) {
        return token;
      }

      const cleanWord = token.replace(/[^a-zA-Z]/g, '').toLowerCase();
      if (this.isClickableWord(cleanWord)) {
        return `<span class="clickable-word" data-word="${cleanWord}" tabindex="0" role="button" aria-label="Tap to hear and learn '${cleanWord}'">${token}</span>`;
      }
      return token;
    }).join('');
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      pending: this.pendingRequests.size
    };
  }
}

/**
 * Create a vocabulary service instance
 * @param {object} options
 * @returns {VocabularyService}
 */
export function createVocabularyService(options = {}) {
  return new VocabularyService(options);
}