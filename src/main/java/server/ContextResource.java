package server; 

import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;

import com.vividsolutions.jts.geom.Coordinate;
import core.shared.Table;

@Path("context")
public class ContextResource {

	@POST
	public void setContext(@QueryParam("isRestricted") final boolean isRestricted,
			@QueryParam("geometry") final String geometry,
			@QueryParam("dataset") final String mainDataset) {

		Context context = Server.context;
		context.setRestricted(isRestricted);

		if(!geometry.equals("null")) {
			System.out.println(geometry);
			String[] coordinates = geometry.split(",");
			Coordinate[] coords = new Coordinate[coordinates.length/2];

			int j = 0;
			for (int i = 0; i < coordinates.length; i+=2) {
				coords[j] = new Coordinate(Double.parseDouble(coordinates[i]),Double.parseDouble(coordinates[i+1]));
				j++;
			}
		}

		if(mainDataset.equals("accidents_usa")) {
			Server.context.setTableToRead( new Table("accidents_usa", "pk_id"));
		}
		else if(mainDataset.equals("fires_portugal")) {
			System.out.println("slice espacial nos fogos em portugal");
			Server.context.setTableToRead( new Table("fires_portugal", "pk_id"));
		}
		else if(mainDataset.equals("accidents_portugal")) {
			//System.out.println("slice espacial nos acidentes em portugal");
			Server.context.setTableToRead( new Table("accidents_portugal", "pk_id"));
		}
		System.out.println("context updated: ");
	}
}
