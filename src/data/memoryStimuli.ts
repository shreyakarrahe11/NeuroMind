import appleImage from '../assets/01_Apple.jpg';
import bottleImage from '../assets/02_Water_Bottle.jpg';
import bookImage from '../assets/03_Books.jpg';
import chairImage from '../assets/04_Chair.jpg';
import clockImage from '../assets/05_Clock.jpg';
import dogImage from '../assets/06_Dog.jpg';
import flowerImage from '../assets/07_Flower.jpg';
import trainImage from '../assets/08_Train.jpg';
import treeImage from '../assets/09_Tree.jpg';
import cupImage from '../assets/10_Cup.jpg';
import carImage from '../assets/11_Car.jpg';
import shoeImage from '../assets/12_Shoes.jpg';
import keysImage from '../assets/13_Keys.jpg';
import phoneImage from '../assets/14_Phone.jpg';
import glassesImage from '../assets/15_Glasses.jpg';
import hatImage from '../assets/16_Hat.jpg';
import umbrellaImage from '../assets/17_Umbrella.jpg';
import bananaImage from '../assets/18_Bananas.jpg';
import catImage from '../assets/19_Cat.jpg';
import houseImage from '../assets/20_House.jpg';

export interface MemoryStimulus {
  id: string;
  label: string;
  imageUrl: string;
}

export const MEMORY_STIMULI: MemoryStimulus[] = [
  { id: 'apple', label: 'Apple', imageUrl: appleImage },
  { id: 'bottle', label: 'Bottle', imageUrl: bottleImage },
  { id: 'book', label: 'Book', imageUrl: bookImage },
  { id: 'chair', label: 'Chair', imageUrl: chairImage },
  { id: 'clock', label: 'Clock', imageUrl: clockImage },
  { id: 'dog', label: 'Dog', imageUrl: dogImage },
  { id: 'flower', label: 'Flower', imageUrl: flowerImage },
  { id: 'train', label: 'Train', imageUrl: trainImage },
  { id: 'tree', label: 'Tree', imageUrl: treeImage },
  { id: 'cup', label: 'Cup', imageUrl: cupImage },
  { id: 'car', label: 'Car', imageUrl: carImage },
  { id: 'shoe', label: 'Shoe', imageUrl: shoeImage },
  { id: 'keys', label: 'Keys', imageUrl: keysImage },
  { id: 'phone', label: 'Phone', imageUrl: phoneImage },
  { id: 'glasses', label: 'Glasses', imageUrl: glassesImage },
  { id: 'hat', label: 'Hat', imageUrl: hatImage },
  { id: 'umbrella', label: 'Umbrella', imageUrl: umbrellaImage },
  { id: 'banana', label: 'Banana', imageUrl: bananaImage },
  { id: 'cat', label: 'Cat', imageUrl: catImage },
  { id: 'house', label: 'House', imageUrl: houseImage }
];