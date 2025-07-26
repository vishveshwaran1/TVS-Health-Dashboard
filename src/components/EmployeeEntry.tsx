import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, User, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmployeeEntryProps {
  onBack: () => void;
  onAddEmployee: (employee: {
     name: string;
  age: string;
  gender: string;
  height: string;
  weight: string;
  bloodGroup: string;
  contactNumber: string;
  }) => void;
}

const EmployeeEntry = ({ onBack, onAddEmployee }: EmployeeEntryProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    gender: 'Male',
    location: '',
    height: '',
    weight: '',
    bloodGroup: '',
    contactNumber: '',
    autoGenerateMAC: true
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Add new employee with all required fields
    onAddEmployee({
      name: `${formData.firstName} ${formData.lastName}`,
      age: formData.age,
      gender: formData.gender,
      height: formData.height || 'Not specified', // Add height field to form
      weight: formData.weight || 'Not specified', // Add weight field to form
      bloodGroup: formData.bloodGroup,
      contactNumber: formData.contactNumber,
    });

    // Success toast
    toast({
      title: "Employee Added",
      description: `${formData.firstName} ${formData.lastName} has been successfully added to the system.`,
    });

    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      age: '',
      gender: 'Male',
      location: '',
      height: '',
      weight: '',
      bloodGroup: '',
      contactNumber: '',
      autoGenerateMAC: true
    });
    
    setImageFile(null);
    setImagePreview(null);
    onBack();
  };

  return (
    <div className="bg-white w-full max-w-2xl mx-auto p-2">
      <div className="text-center justify-center mb-6 flex items-center">
        <div>
          <h2 className="text-2xl font-bold">Add New Employee</h2>
          <p>Enter the employee details below to create a new monitoring profile.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="firstName" className="font-medium">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData({...formData, firstName: e.target.value})}
              className="bg-white border border-gray-300 text-black placeholder-gray-500"
              placeholder="First Name"
              required
            />
          </div>
          <div>
            <Label htmlFor="lastName" className="font-medium">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData({...formData, lastName: e.target.value})}
              className="bg-white border border-gray-300 text-black placeholder-gray-500"
              placeholder="Last Name"
              required
            />
          </div>
        </div>

        {/* Age and Gender */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="age" className="font-medium">Age</Label>
            <Input
              id="age"
              type="number"
              value={formData.age}
              onChange={(e) => setFormData({...formData, age: e.target.value})}
              className="bg-white border border-gray-300 text-black placeholder-gray-500"
              placeholder="27"
              required
            />
          </div>
          <div>
            <Label htmlFor="gender" className="font-medium">Gender</Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={(e) => setFormData({...formData, gender: e.target.value})}
              className="w-full h-10 px-3 py-2 bg-white border border-gray-300 rounded-md text-black"
              required
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location" className="font-medium">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({...formData, location: e.target.value})}
            className="bg-white border border-gray-300 text-black placeholder-gray-500"
            placeholder="Chamber location"
            required
          />
        </div>

        {/* Blood Group and Contact Number */}
        <div className="grid grid-cols-2 gap-">
          <div>
            <Label htmlFor="bloodGroup" className="font-medium">Blood Group</Label>
            <Input
              id="bloodGroup"
              value={formData.bloodGroup}
              onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
              className="bg-white border border-gray-300 text-black placeholder-gray-500"
              placeholder="e.g. A+"
              required
            />
          </div>
          <div>
            <Label htmlFor="contactNumber" className="font-medium">Contact Number</Label>
            <Input
              id="contactNumber"
              type="tel"
              value={formData.contactNumber}
              onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
              className="bg-white border border-gray-300 text-black placeholder-gray-500"
              placeholder="Phone number"
              required
            />
          </div>
        </div>

        {/* Auto-generate MAC Address */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="autoGenerateMAC"
            checked={formData.autoGenerateMAC}
            onCheckedChange={(checked) => setFormData({...formData, autoGenerateMAC: checked as boolean})}
            className="border-white data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
          />
          <Label htmlFor="autoGenerateMAC" className="font-medium">
            Auto-generate MAC Address
          </Label>
        </div>

        {/* Photo Upload */}
        <div>
          <Label className="font-medium">Photo</Label>
          <div className="mt-2">
            <div className="flex items-center">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <Button
                type="button"
                variant="outline"
                className="bg-white text-black border-gray-300 hover:bg-gray-50"
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                Choose File
              </Button>
              <span className=" text-sm ml-2">
                {imageFile ? imageFile.name : 'No file chosen'}
              </span>
            </div>
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Employee preview"
                  className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            className="bg-white text-black border-gray-300 hover:bg-gray-50"
            onClick={onBack}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          >
            Add Employee
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeEntry;
