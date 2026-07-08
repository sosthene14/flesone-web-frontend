import { Route, MapPin, Users, Clock, Bus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Line } from "@/store/useLineStore";
 
interface LineCardProps {
  line: Line;
  onEdit: () => void;
  onDelete: () => void;
}

export function LineCard({ line, onEdit, onDelete }: LineCardProps) {
  const isActive = line.status === "active";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4">
        <Route className="h-5 w-5 text-muted-foreground" />
        <Badge variant={isActive ? "success" : "secondary"}>
          <span className={`mr-1 h-1.5 w-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-gray-400"}`} />
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        <p className="text-base font-semibold leading-snug truncate">{line.name}</p>
        {line.description && (
          <p className="text-md text-muted-foreground mt-1 line-clamp-2">{line.description}</p>
        )}
        <div className="mt-3 flex flex-col gap-1.5 text-md text-muted-foreground">
         
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Créée le {new Date(line.created_at).toLocaleDateString()}
          </span>
        </div>
  
      </CardContent>

      <CardFooter className="flex justify-end gap-2 p-4 pt-0 border-t">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Edit className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Supprimer
        </Button>
      </CardFooter>
    </Card>
  );
}